from django.db import models
from django.contrib.auth.models import AbstractUser
from tenants.models import Institution

def avatar_upload_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower()
    return f'avatars/user_{instance.pk}.{ext}'


class User(AbstractUser):
    class Roles(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        DIRECTIVO = 'DIRECTIVO', 'Directivo'
        DOCENTE = 'DOCENTE', 'Docente'
        PADRE = 'PADRE', 'Padre'
        ENFERMERIA = 'ENFERMERIA', 'Enfermería'

    email = models.EmailField(unique=True)
    role = models.CharField(
        max_length=20,
        choices=Roles.choices,
        default=Roles.PADRE
    )
    tenant = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users"
    )
    avatar = models.ImageField(
        upload_to=avatar_upload_path,
        null=True,
        blank=True,
        verbose_name='foto de perfil'
    )

    class Meta:
        db_table = 'users_user'
        verbose_name = 'usuario'
        verbose_name_plural = 'usuarios'

    # Ensure username is unique, but email can be used for login as well
    def __str__(self):
        return f"{self.username} ({self.role})"


class Teacher(models.Model):
    class Idiomas(models.TextChoices):
        ESPANOL = 'ESPANOL', 'Español'
        INGLES = 'INGLES', 'Inglés'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="teacher_profile"
    )
    departamento = models.CharField(max_length=100)
    idioma = models.CharField(
        max_length=10,
        choices=Idiomas.choices,
        default=Idiomas.ESPANOL
    )
    tenant = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name="teachers"
    )

    class Meta:
        db_table = 'users_teacher'
        verbose_name = 'docente'
        verbose_name_plural = 'docentes'

    def __str__(self):
        return f"Docente: {self.user.get_full_name() or self.user.username}"


class Parent(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="parent_profile"
    )
    # Many-to-many relationship with Student. To avoid circular imports, reference Student by string.
    students = models.ManyToManyField(
        'academics.Student',
        related_name='parents',
        blank=True
    )
    tenant = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name="parents"
    )

    class Meta:
        db_table = 'users_parent'
        verbose_name = 'padre_tutor'
        verbose_name_plural = 'padres_tutores'

    def __str__(self):
        return f"Tutor: {self.user.get_full_name() or self.user.username}"
