from django.db import models
from tenants.models import Institution
from tenants.utils import get_current_tenant_id

class TenantManager(models.Manager):
    """
    Manager que filtra automáticamente por el tenant activo.

    Fail-closed: si no hay tenant en el contexto (p. ej. una vista que olvidó
    usar TenantViewMixin, o un request sin token), devuelve un queryset vacío
    en lugar de TODOS los registros. Para acceso global/administrativo
    deliberado usar `Model.all_objects` con un filtro de tenant explícito.
    """
    def get_queryset(self):
        queryset = super().get_queryset()
        tenant_id = get_current_tenant_id()
        if tenant_id is not None:
            return queryset.filter(tenant_id=tenant_id)
        return queryset.none()

class TenantModel(models.Model):
    """
    Abstract base model that enforces tenant isolation.
    Adds a ForeignKey to Institution and replaces the default manager.
    """
    tenant = models.ForeignKey(
        Institution,
        on_delete=models.CASCADE,
        related_name="%(class)s_records"
    )

    # Default manager is tenant-aware
    objects = TenantManager()
    
    # Unfiltered manager to allow global queries if explicitly needed (e.g., admin tasks)
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        # Automatically assign tenant if not set and context is active
        if getattr(self, 'tenant_id', None) is None:
            tenant_id = get_current_tenant_id()
            if tenant_id is not None:
                self.tenant_id = tenant_id
        super().save(*args, **kwargs)


class TenantViewMixin:
    """
    Mixin for DRF views that sets the active tenant context based ONLY on
    the authenticated user. Después de que DRF autentica el JWT, request.user
    ya está poblado, así que esta es la fuente confiable del tenant.

    Nota de seguridad: ya no se aceptan el header X-Tenant-ID ni el query
    param ?tenant_id, que permitían suplantar el tenant de otro colegio.
    """
    def initial(self, request, *args, **kwargs):
        from tenants.utils import set_current_tenant_id
        tenant_id = None

        if request.user and request.user.is_authenticated:
            tenant_id = getattr(request.user, 'tenant_id', None)

        self.tenant_context_token = set_current_tenant_id(tenant_id)
        super().initial(request, *args, **kwargs)

    def finalize_response(self, request, response, *args, **kwargs):
        from tenants.utils import clear_current_tenant_id
        res = super().finalize_response(request, response, *args, **kwargs)
        if hasattr(self, 'tenant_context_token'):
            clear_current_tenant_id(self.tenant_context_token)
        return res

    def get_queryset(self):
        """
        Dynamically builds a fresh queryset using the model manager
        so the tenant isolation filter is evaluated within the request context.
        """
        if self.queryset is not None:
            model = self.queryset.model
        elif self.serializer_class is not None:
            model = self.serializer_class.Meta.model
        else:
            raise AttributeError("ViewSet must configure 'queryset' or 'serializer_class'")
        return model.objects.all()


