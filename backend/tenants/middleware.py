from rest_framework_simplejwt.authentication import JWTAuthentication

from tenants.utils import set_current_tenant_id, clear_current_tenant_id


class TenantMiddleware:
    """
    Determina el tenant activo de cada request y lo guarda en contextvars
    durante el ciclo de vida del request.

    SEGURIDAD: el tenant se deriva de fuentes NO falsificables:
      1. Usuario autenticado por sesión (Django admin).
      2. Claim `tenant_id` del JWT *validado* (API). El token está firmado,
         por lo que el cliente no puede alterar el tenant.

    Ya NO se aceptan los headers X-Tenant-ID ni el query param ?tenant_id,
    que permitían a cualquier usuario leer datos de otro colegio.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._jwt_auth = JWTAuthentication()

    def _tenant_from_jwt(self, request):
        """Extrae y valida el tenant_id del JWT del header Authorization."""
        try:
            header = self._jwt_auth.get_header(request)
            if header is None:
                return None
            raw_token = self._jwt_auth.get_raw_token(header)
            if raw_token is None:
                return None
            validated_token = self._jwt_auth.get_validated_token(raw_token)
            return validated_token.get('tenant_id')
        except Exception:
            # Token inválido/expirado: que DRF responda 401 más adelante.
            return None

    def __call__(self, request):
        tenant_id = None

        # 1. Sesión Django (admin) — request.user ya está poblado aquí.
        if hasattr(request, 'user') and request.user.is_authenticated:
            tenant_id = getattr(request.user, 'tenant_id', None)

        # 2. JWT firmado (API). La autenticación DRF ocurre DESPUÉS de este
        #    middleware, por eso decodificamos el token nosotros mismos.
        if tenant_id is None:
            tenant_id = self._tenant_from_jwt(request)

        token = set_current_tenant_id(tenant_id)
        try:
            response = self.get_response(request)
        finally:
            # Siempre limpiar el contexto al terminar el request.
            clear_current_tenant_id(token)

        return response
