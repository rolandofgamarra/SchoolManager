from django.db import models

class Institution(models.Model):
    nombre = models.CharField(max_length=255)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    config_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tenants_institution'
        verbose_name = 'institucion'
        verbose_name_plural = 'instituciones'

    def __str__(self):
        return str(self.nombre)
