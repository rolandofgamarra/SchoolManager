import secrets
from django.core.cache import cache
from rest_framework import status, serializers, permissions
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from django.core.mail import send_mass_mail
from django.conf import settings
from users.serializers import (
    CustomTokenObtainPairSerializer,
    UserSerializer,
    TeacherSerializer,
    ParentSerializer,
    AvatarUploadSerializer,
)
from users.models import User, Parent
from academics.models import Student


def _client_ip(request):
    """IP del cliente, respetando X-Forwarded-For detrás de un proxy."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class CustomTokenObtainPairView(TokenObtainPairView):
    """Login con lockout (3 intentos → 15 min) + throttle de 5 req/min.

    El lockout se llavea por (IP + username) en vez de solo username, para
    evitar que un atacante bloquee la cuenta de cualquier usuario a voluntad.
    """

    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        username = request.data.get("username")

        if not username:
            return super().post(request, *args, **kwargs)

        scope = f"{_client_ip(request)}_{username}"
        lockout_key = f"lockout_{scope}"
        attempts_key = f"attempts_{scope}"

        # Check if username is locked out
        if cache.get(lockout_key):
            return Response(
                {
                    "detail": "Cuenta bloqueada temporalmente por 15 minutos debido a demasiados intentos fallidos."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)

        try:
            serializer.is_valid(raise_exception=True)
            # Login successful: clear failure count
            cache.delete(attempts_key)
            return Response(serializer.validated_data, status=status.HTTP_200_OK)

        except Exception as e:
            # Login failed: increment attempts
            attempts = cache.get(attempts_key, 0) + 1
            cache.set(attempts_key, attempts, timeout=900)  # Expires in 15 mins

            if attempts >= 3:
                cache.set(lockout_key, True, timeout=900)  # Lockout for 15 mins
                return Response(
                    {
                        "detail": "Cuenta bloqueada temporalmente por 15 minutos debido a demasiados intentos fallidos."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            raise e


class UserMeView(APIView):
    """
    Endpoint /api/users/me/ — perfil del usuario autenticado.
    GET: devuelve datos + avatar_url.
    PATCH: actualiza first_name / last_name.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        serializer = UserSerializer(user, context={"request": request})
        data = serializer.data
        if user.role == User.Roles.DOCENTE and hasattr(user, "teacher_profile"):
            data["profile"] = TeacherSerializer(user.teacher_profile).data
        elif user.role == User.Roles.PADRE and hasattr(user, "parent_profile"):
            data["profile"] = ParentSerializer(user.parent_profile).data
        return Response(data)

    def patch(self, request):
        allowed = {
            k: v for k, v in request.data.items() if k in ("first_name", "last_name")
        }
        for field, value in allowed.items():
            setattr(request.user, field, value)
        request.user.save(update_fields=list(allowed.keys()))
        return Response(UserSerializer(request.user, context={"request": request}).data)


class AvatarUploadView(APIView):
    """POST /api/users/avatar/ — JPG/PNG/WebP, máx 2 MB."""

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "upload"

    def post(self, request):
        import os

        # request.FILES es la fuente correcta para archivos en multipart/form-data
        file = request.FILES.get("avatar")
        if not file:
            return Response(
                {
                    "detail": 'No se recibió ningún archivo. Enviá el campo "avatar" como multipart.'
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validar tipo y tamaño antes de guardar
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
            return Response(
                {"detail": "Formato no permitido. Usá JPG, PNG o WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file.size > 2 * 1024 * 1024:
            return Response(
                {"detail": "El archivo no puede superar 2 MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Borrar avatar anterior del disco antes de guardar el nuevo
            old = request.user.avatar
            if old and old.name:
                try:
                    old_path = old.path
                    if os.path.isfile(old_path):
                        os.remove(old_path)
                except Exception:
                    pass  # no bloquear el upload si falla el borrado

            request.user.avatar = file
            request.user.save(update_fields=["avatar"])
            request.user.refresh_from_db()

            avatar_url = request.build_absolute_uri(request.user.avatar.url)
            return Response({"avatar_url": avatar_url}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"detail": f"Error al guardar la imagen: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request):
        import os

        user = request.user
        if user.avatar and user.avatar.name:
            try:
                path = user.avatar.path
                if os.path.isfile(path):
                    os.remove(path)
            except Exception:
                pass
            user.avatar = None
            user.save(update_fields=["avatar"])
        return Response({"avatar_url": None}, status=status.HTTP_200_OK)


class SendAnnouncementView(APIView):
    """
    Endpoint para que Directivos/Admins envíen un correo a los padres.
    POST /api/users/announcement/
    body: { subject, message, grade_id (optional) }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in [User.Roles.ADMIN, User.Roles.DIRECTIVO]:
            return Response(
                {"detail": "No tienes permiso para enviar anuncios."},
                status=status.HTTP_403_FORBIDDEN,
            )

        subject = request.data.get("subject")
        message = request.data.get("message")
        grade_id = request.data.get("grade_id")

        if not subject or not message:
            return Response(
                {"detail": "Asunto y mensaje son requeridos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filtrar padres del tenant
        parents = Parent.objects.filter(tenant=user.tenant)

        if grade_id:
            # Filtrar padres que tienen hijos en ese grado
            students_in_grade = Student.objects.filter(
                grado_id=grade_id, tenant=user.tenant
            )
            parents = parents.filter(students__in=students_in_grade).distinct()

        # Extraer correos
        recipient_list = [p.user.email for p in parents if p.user.email]

        if not recipient_list:
            return Response(
                {
                    "detail": "No se encontraron destinatarios para el filtro seleccionado."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Preparar correos para send_mass_mail
        # send_mass_mail takes a tuple of (subject, message, from_email, recipient_list)
        # Cada tupla es un correo
        messages = []
        for recipient in recipient_list:
            messages.append(
                (
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [recipient],
                )
            )

        try:
            # send_mass_mail opens a single connection to the SMTP server to send all messages
            send_mass_mail(tuple(messages), fail_silently=False)
            return Response(
                {
                    "detail": f"Anuncio enviado exitosamente a {len(recipient_list)} padres."
                }
            )
        except Exception as e:
            return Response(
                {"detail": f"Error al enviar correos: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class QuickParentEnrollView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.role not in [
            User.Roles.ADMIN,
            User.Roles.DIRECTIVO,
            User.Roles.DOCENTE,
        ]:
            return Response(
                {"detail": "No tienes permiso."}, status=status.HTTP_403_FORBIDDEN
            )

        email = request.data.get("email")
        nombre = request.data.get("nombre")
        telefono = request.data.get("telefono")
        student_id = request.data.get("student_id")

        if not email or not nombre or not student_id:
            return Response(
                {"detail": "Faltan datos (email, nombre, student_id)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            student = Student.objects.get(id=student_id, tenant=user.tenant)
        except Student.DoesNotExist:
            return Response(
                {"detail": "Alumno no encontrado."}, status=status.HTTP_404_NOT_FOUND
            )

        # Check if user already exists
        if User.objects.filter(email=email).exists():
            existing_user = User.objects.get(email=email)
            parent_profile, _ = Parent.objects.get_or_create(
                user=existing_user, tenant=user.tenant
            )
            parent_profile.students.add(student)
            return Response({"detail": "Tutor vinculado al alumno (ya existía)."})

        # Create new User. secrets.token_urlsafe reemplaza a make_random_password,
        # que fue removido en Django 5.1.
        password = secrets.token_urlsafe(12)
        new_user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            role=User.Roles.PADRE,
            tenant=user.tenant,
        )

        parent_profile = Parent.objects.create(
            user=new_user, tenant=user.tenant, relacion="Tutor", telefono=telefono or ""
        )
        parent_profile.students.add(student)

        # Ideally, send an email with the password. For now, we return it to the frontend.
        return Response(
            {
                "detail": "Tutor creado y vinculado.",
                "email": email,
                "temporary_password": password,
            },
            status=status.HTTP_201_CREATED,
        )
