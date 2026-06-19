from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import date
from tenants.models import Institution
from users.models import User, Teacher, Parent
from academics.models import GradeLevel, Student, Period, Subject, Evaluation, Note, Attendance

class AcademicsTests(APITestCase):
    def setUp(self):
        # Clear cache before each test
        cache.clear()

        # Create two Institutions (Tenants)
        self.tenant_a = Institution.objects.create(nombre="Colegio A", config_json={})
        self.tenant_b = Institution.objects.create(nombre="Colegio B", config_json={})

        # Create user accounts for Tenant A
        self.teacher_a_user = User.objects.create_user(
            username="teacher_a",
            email="teacher_a@colegioa.edu",
            password="Password123",
            role=User.Roles.DOCENTE,
            tenant=self.tenant_a
        )
        self.teacher_a_profile = Teacher.objects.create(
            user=self.teacher_a_user,
            departamento="Matemáticas",
            idioma=Teacher.Idiomas.ESPANOL,
            tenant=self.tenant_a
        )

        self.parent_a_user = User.objects.create_user(
            username="parent_a",
            email="parent_a@gmail.com",
            password="Password123",
            role=User.Roles.PADRE,
            tenant=self.tenant_a
        )
        self.parent_a_profile = Parent.objects.create(
            user=self.parent_a_user,
            tenant=self.tenant_a
        )

        # Create user accounts for Tenant B
        self.teacher_b_user = User.objects.create_user(
            username="teacher_b",
            email="teacher_b@colegiob.edu",
            password="Password123",
            role=User.Roles.DOCENTE,
            tenant=self.tenant_b
        )
        self.teacher_b_profile = Teacher.objects.create(
            user=self.teacher_b_user,
            departamento="Inglés",
            idioma=Teacher.Idiomas.INGLES,
            tenant=self.tenant_b
        )

        # Create Academics context for Tenant A
        self.grade_a = GradeLevel.objects.create(
            nombre="Primer Grado", nivel="Primaria", seccion="A", tenant=self.tenant_a
        )
        self.student_a = Student.objects.create(
            nombre="Juan", apellido="Pérez", fecha_nac=date(2018, 5, 12), grado=self.grade_a, seccion="A", tenant=self.tenant_a
        )
        # Link Student A to Parent A
        self.parent_a_profile.students.add(self.student_a)

        self.subject_a = Subject.objects.create(
            nombre="Matemáticas", docente=self.teacher_a_profile, grado=self.grade_a, idioma=Subject.Idiomas.ESPANOL, tenant=self.tenant_a
        )
        self.period_a = Period.objects.create(
            nombre="Primer Semestre 2026", tipo=Period.Tipos.SEMESTRE_1, area=Period.Areas.ESPANOL, fecha_inicio=date(2026, 2, 1), fecha_fin=date(2026, 6, 30), tenant=self.tenant_a
        )
        self.eval_a = Evaluation.objects.create(
            tipo=Evaluation.Tipos.PROCESO, materia=self.subject_a, ponderacion=70.00, descripcion="Tareas", periodo=self.period_a, tenant=self.tenant_a
        )

        # Create Academics context for Tenant B
        self.grade_b = GradeLevel.objects.create(
            nombre="Grade 1", nivel="Primary", seccion="B", tenant=self.tenant_b
        )
        self.student_b = Student.objects.create(
            nombre="John", apellido="Smith", fecha_nac=date(2018, 8, 20), grado=self.grade_b, seccion="B", tenant=self.tenant_b
        )
        self.subject_b = Subject.objects.create(
            nombre="Maths", docente=self.teacher_b_profile, grado=self.grade_b, idioma=Subject.Idiomas.INGLES, tenant=self.tenant_b
        )
        self.period_b = Period.objects.create(
            nombre="1st Semester 2026", tipo=Period.Tipos.SEMESTRE_1, area=Period.Areas.INGLES, fecha_inicio=date(2026, 2, 1), fecha_fin=date(2026, 6, 30), tenant=self.tenant_b
        )
        self.eval_b = Evaluation.objects.create(
            tipo=Evaluation.Tipos.PROCESO, materia=self.subject_b, ponderacion=70.00, descripcion="Homework", periodo=self.period_b, tenant=self.tenant_b
        )

    def test_tenant_isolation_student_list(self):
        """
        Verify that Teacher A only sees Student A, and Teacher B only sees Student B.
        """
        # Authenticate as Teacher A
        self.client.force_authenticate(user=self.teacher_a_user)
        response = self.client.get(reverse('alumno-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Paginated: response.data has 'results' key
        results = response.data.get('results', response.data)
        # Should only return 1 student (Juan Pérez), not Student B (John Smith)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], "Juan")

        # Authenticate as Teacher B
        self.client.force_authenticate(user=self.teacher_b_user)
        response = self.client.get(reverse('alumno-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], "John")

    def test_tenant_isolation_direct_access_protection(self):
        """
        Verify that Teacher A cannot view or modify Tenant B's student details.
        """
        # Authenticate as Teacher A
        self.client.force_authenticate(user=self.teacher_a_user)

        # Try to view Student B details (should return 404 because Tenant isolation hides Tenant B)
        url = reverse('alumno-detail', args=[self.student_b.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_x_tenant_id_header_is_ignored(self):
        """
        El header X-Tenant-ID ya no debe permitir suplantar otro colegio:
        Teacher A pidiendo con X-Tenant-ID de B sigue viendo solo a su alumno.
        """
        self.client.force_authenticate(user=self.teacher_a_user)
        response = self.client.get(
            reverse('alumno-list'), HTTP_X_TENANT_ID=str(self.tenant_b.id)
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nombre'], "Juan")

    def test_dashboard_stats_no_cross_tenant_leak(self):
        """
        DashboardStatsView debe contar solo los alumnos del tenant del usuario,
        y el caché no debe filtrar datos entre colegios (regresión #1/#2).
        """
        url = reverse('dashboard-stats')

        self.client.force_authenticate(user=self.teacher_a_user)
        resp_a = self.client.get(url)
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_a.data['total_students'], 1)  # solo Student A

        self.client.force_authenticate(user=self.teacher_b_user)
        resp_b = self.client.get(url)
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_b.data['total_students'], 1)  # solo Student B, no 2

    def test_serializer_rejects_cross_tenant_fk(self):
        """
        Un docente de A no puede crear una materia asignando un docente de B
        (TenantPrimaryKeyRelatedField, regresión #7).
        """
        self.client.force_authenticate(user=self.teacher_a_user)
        payload = {
            'nombre': 'Hack', 'grado': self.grade_a.id,
            'idioma': 'ESPANOL', 'creditos': 1,
            'docente': self.teacher_b_profile.id,  # docente de otro colegio
        }
        response = self.client.post(reverse('materia-list'), payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('docente', response.data)

    def test_parent_restricted_access(self):
        """
        Verify that Parent A can only see Student A's notes, not Student B's.
        """
        # Set up a note for Student A
        note_a = Note.objects.create(
            alumno=self.student_a,
            evaluacion=self.eval_a,
            valor=8.50,
            tenant=self.tenant_a
        )
        # Set up a note for Student B (Tenant B)
        note_b = Note.objects.create(
            alumno=self.student_b,
            evaluacion=self.eval_b,
            valor=9.00,
            tenant=self.tenant_b
        )

        # Authenticate as Parent A
        self.client.force_authenticate(user=self.parent_a_user)
        
        # Call notes list
        response = self.client.get(reverse('nota-list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        # Parent A should only see Note A
        self.assertEqual(len(results), 1)
        self.assertEqual(float(results[0]['valor']), 8.50)

    def test_login_lockout_policy(self):
        """
        Verify that 3 consecutive failed login attempts locks the account for 15 minutes.
        """
        login_url = reverse('auth_login')
        
        # 1st attempt - failure
        response = self.client.post(login_url, {"username": "teacher_a", "password": "wrong_password"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 2nd attempt - failure
        response = self.client.post(login_url, {"username": "teacher_a", "password": "wrong_password"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # 3rd attempt - triggers lockout
        response = self.client.post(login_url, {"username": "teacher_a", "password": "wrong_password"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("bloqueada", response.data['detail'])

        # 4th attempt - even with correct credentials, should be locked out
        response = self.client.post(login_url, {"username": "teacher_a", "password": "Password123"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_successful_auth_clears_attempts(self):
        """
        Verify that a successful login clears previous failure counters.
        """
        login_url = reverse('auth_login')
        
        # 1st attempt - failure
        self.client.post(login_url, {"username": "teacher_a", "password": "wrong_password"})
        
        # 2nd attempt - success
        response = self.client.post(login_url, {"username": "teacher_a", "password": "Password123"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3rd attempt - failure (counter should reset to 1, not trigger lockout)
        self.client.force_authenticate(user=None) # Log out client
        response = self.client.post(login_url, {"username": "teacher_a", "password": "wrong_password"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
