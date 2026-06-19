from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from tenants.models import Institution
from tenants.serializers import InstitutionSerializer
from tenants.utils import get_current_tenant_id

class TenantSettingsView(generics.RetrieveUpdateAPIView):
    serializer_class = InstitutionSerializer
    # permission_classes = [IsAuthenticated] # Uncomment in prod
    
    def get_object(self):
        tenant_id = get_current_tenant_id()
        if not tenant_id:
            # Fallback to the first tenant for prototype if missing context
            obj = Institution.objects.first()
            if not obj:
                # Create a default institution if none exists
                obj = Institution.objects.create(nombre="Mi Colegio Default")
            return obj
        return Institution.objects.get(id=tenant_id)
