from django.db import models
from tenants.mixins import TenantModel

class GradeLevel(TenantModel):
    class Ciclos(models.TextChoices):
        INICIAL = 'INICIAL', 'Nivel Inicial (Kinder 3 - Kinder 5)'
        PRIMER_CICLO = 'PRIMER_CICLO', 'Primer Ciclo (1ro - 3ro)'
        SEGUNDO_CICLO = 'SEGUNDO_CICLO', 'Segundo Ciclo (4to - 6to)'
        TERCER_CICLO = 'TERCER_CICLO', 'Tercer Ciclo (7mo - 9no)'
        NIVEL_MEDIO = 'NIVEL_MEDIO', 'Nivel Medio (1ro - 3ro de la Media)'
        ENGLISH_K12 = 'ENGLISH_K12', 'English K-12'

    class Idiomas(models.TextChoices):
        ESPANOL = 'ESPANOL', 'Español'
        INGLES = 'INGLES', 'Inglés'

    codigo = models.CharField(max_length=20, blank=True, null=True)
    nombre = models.CharField(max_length=100) # e.g. "Primer Grado", "10th Grade"
    nivel = models.CharField(max_length=50) # e.g. "Primaria", "Secundaria", "Media"
    seccion = models.CharField(max_length=10) # e.g. "A", "B"
    ciclo = models.CharField(
        max_length=20,
        choices=Ciclos.choices,
        default=Ciclos.PRIMER_CICLO
    )
    idioma_seccion = models.CharField(
        max_length=10,
        choices=Idiomas.choices,
        default=Idiomas.ESPANOL
    )

    class Meta:
        db_table = 'academics_grade_level'
        verbose_name = 'grado_nivel'
        verbose_name_plural = 'grados_niveles'

    def __str__(self):
        prefix = f"{self.codigo} - " if self.codigo else ""
        return f"{prefix}{self.nombre} - Sección {self.seccion} ({self.idioma_seccion})"


class Student(TenantModel):
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150)
    fecha_nac = models.DateField()
    grado = models.ForeignKey(
        GradeLevel,
        on_delete=models.PROTECT,
        related_name="students"
    )
    seccion = models.CharField(max_length=10)
    tutor = models.ForeignKey(
        'users.Parent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="students_associated"
    )

    class Meta:
        db_table = 'students_student'
        verbose_name = 'alumno'
        verbose_name_plural = 'alumnos'
        ordering = ['apellido', 'nombre']

    def __str__(self):
        return f"{self.apellido}, {self.nombre}"


class Subject(TenantModel):
    class Idiomas(models.TextChoices):
        ESPANOL = 'ESPANOL', 'Español'
        INGLES = 'INGLES', 'Inglés'

    codigo = models.CharField(max_length=20, blank=True, null=True)
    nombre = models.CharField(max_length=150)
    docente = models.ForeignKey(
        'users.Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subjects"
    )
    grado = models.ForeignKey(
        GradeLevel,
        on_delete=models.PROTECT,
        related_name="subjects"
    )
    idioma = models.CharField(
        max_length=10,
        choices=Idiomas.choices,
        default=Idiomas.ESPANOL
    )
    creditos = models.IntegerField(default=1)

    class Meta:
        db_table = 'academics_subject'
        verbose_name = 'materia'
        verbose_name_plural = 'materias'

    def __str__(self):
        prefix = f"{self.codigo} - " if self.codigo else ""
        return f"{prefix}{self.nombre} ({self.idioma}) - {self.grado.nombre}"


class Period(TenantModel):
    class Tipos(models.TextChoices):
        SEMESTRE_1 = 'SEMESTRE_1', 'Primer Semestre'
        SEMESTRE_2 = 'SEMESTRE_2', 'Segundo Semestre'
        COMPLEMENTARIO_DIC = 'COMPLEMENTARIO_DIC', 'Examen Complementario Diciembre'
        COMPLEMENTARIO_FEB = 'COMPLEMENTARIO_FEB', 'Examen Complementario Febrero'

    class Areas(models.TextChoices):
        ESPANOL = 'ESPANOL', 'Español'
        INGLES = 'INGLES', 'Inglés'
        GLOBAL = 'GLOBAL', 'Global'

    nombre = models.CharField(max_length=100) # e.g. "Año Lectivo 2026 - Semestre 1"
    tipo = models.CharField(
        max_length=20,
        choices=Tipos.choices,
        default=Tipos.SEMESTRE_1
    )
    area = models.CharField(
        max_length=10,
        choices=Areas.choices,
        default=Areas.GLOBAL
    )
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    class Meta:
        db_table = 'academics_period'
        verbose_name = 'periodo'
        verbose_name_plural = 'periodos'

    def __str__(self):
        return f"{self.nombre} ({self.area})"


class Evaluation(TenantModel):
    class Tipos(models.TextChoices):
        PROCESO = 'PROCESO', 'Proceso (70%)'
        EVALUACION = 'EVALUACION', 'Evaluación/Valoración (30%)'
        SOCIOAFECTIVO = 'SOCIOAFECTIVO', 'Rasgos Socioafectivos (10%)'

    tipo = models.CharField(
        max_length=20,
        choices=Tipos.choices,
        default=Tipos.PROCESO
    )
    materia = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="evaluations"
    )
    ponderacion = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Ponderación porcentual (e.g., 70.00 para 70%)"
    )
    descripcion = models.CharField(max_length=255)
    periodo = models.ForeignKey(
        Period,
        on_delete=models.PROTECT,
        related_name="evaluations"
    )
    fecha = models.DateField(
        null=True, 
        blank=True, 
        help_text="Fecha programada para esta evaluación o proceso"
    )

    class Meta:
        db_table = 'academics_evaluation'
        verbose_name = 'evaluacion'
        verbose_name_plural = 'evaluaciones'

    def __str__(self):
        return f"{self.descripcion} ({self.get_tipo_display()}) - {self.materia.nombre}"


class Note(TenantModel):
    class SyncStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        SYNCING = 'SYNCING', 'Sincronizando'
        SYNCED = 'SYNCED', 'Sincronizado'
        CONFLICT = 'CONFLICT', 'Conflicto'

    alumno = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="notes"
    )
    evaluacion = models.ForeignKey(
        Evaluation,
        on_delete=models.CASCADE,
        related_name="notes"
    )
    valor = models.DecimalField(
        max_digits=5,
        decimal_places=2
    )
    timestamp_utc = models.DateTimeField(auto_now_add=True)
    sync_status = models.CharField(
        max_length=15,
        choices=SyncStatus.choices,
        default=SyncStatus.SYNCED
    )

    class Meta:
        db_table = 'academics_note'
        verbose_name = 'nota'
        verbose_name_plural = 'notas'
        ordering = ['-timestamp_utc']

    def __str__(self):
        return f"{self.alumno}: {self.valor} en {self.evaluacion.descripcion}"


class Attendance(TenantModel):
    class SyncStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        SYNCING = 'SYNCING', 'Sincronizando'
        SYNCED = 'SYNCED', 'Sincronizado'
        CONFLICT = 'CONFLICT', 'Conflicto'

    class Estados(models.TextChoices):
        PRESENTE = 'PRESENTE', 'Presente'
        AUSENTE_JUSTIFICADO = 'AUSENTE_JUSTIFICADO', 'Ausente Justificado'
        AUSENTE_INJUSTIFICADO = 'AUSENTE_INJUSTIFICADO', 'Ausente Injustificado'
        TARDANZA = 'TARDANZA', 'Tardanza'

    alumno = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )
    fecha = models.DateField()
    estado = models.CharField(
        max_length=25,
        choices=Estados.choices,
        default=Estados.PRESENTE
    )
    justificacion = models.TextField(blank=True, null=True)
    sync_status = models.CharField(
        max_length=15,
        choices=SyncStatus.choices,
        default=SyncStatus.SYNCED
    )

    class Meta:
        db_table = 'academics_attendance'
        verbose_name = 'asistencia'
        verbose_name_plural = 'asistencias'

    def __str__(self):
        return f"{self.alumno} - {self.fecha}: {self.estado}"


from django.utils import timezone

class Affective(TenantModel):
    class SyncStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pendiente'
        SYNCING = 'SYNCING', 'Sincronizando'
        SYNCED = 'SYNCED', 'Sincronizado'
        CONFLICT = 'CONFLICT', 'Conflicto'

    alumno = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="affective_records"
    )
    periodo = models.ForeignKey(
        Period,
        on_delete=models.PROTECT,
        related_name="affective_records"
    )
    docente = models.ForeignKey(
        'users.Teacher',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="affective_evaluations"
    )
    fecha_evaluacion = models.DateField(default=timezone.now)
    # Dimensions like convivencia, participacion, responsabilidad, regulacion, trabajo_en_equipo
    # Evaluated as: MB (Muy Bien), B (Bien), R (Regular), I (Insuficiente)
    dimensiones = models.JSONField(
        default=dict,
        help_text="Dimensión y calificación (e.g. {'convivencia': 'MB', 'participacion': 'B'})"
    )
    observaciones = models.TextField(blank=True, null=True)
    sync_status = models.CharField(
        max_length=15,
        choices=SyncStatus.choices,
        default=SyncStatus.SYNCED
    )

    class Meta:
        db_table = 'academics_affective'
        verbose_name = 'socioafectivo'
        verbose_name_plural = 'socioafectivos'

    def __str__(self):
        return f"Socio-Afectivo: {self.alumno} - {self.periodo.nombre}"


class AnnualPlan(TenantModel):
    class Tipos(models.TextChoices):
        ANUAL = 'ANUAL', 'Plan Anual'
        SEMANAL = 'SEMANAL', 'Plan Semanal'

    docente = models.ForeignKey(
        'users.Teacher',
        on_delete=models.CASCADE,
        related_name="annual_plans"
    )
    materia = models.ForeignKey(
        Subject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="annual_plans"
    )
    año_lectivo = models.IntegerField()
    archivo = models.FileField(upload_to='annual_plans/')
    tipo = models.CharField(
        max_length=20,
        choices=Tipos.choices,
        default=Tipos.ANUAL
    )
    fecha_subida = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'academics_annual_plan'
        verbose_name = 'plan anual'
        verbose_name_plural = 'planes anuales'
        ordering = ['-fecha_subida']

    def __str__(self):
        return f"Plan {self.año_lectivo} - {self.docente} ({self.materia.nombre if self.materia else 'Global'})"
