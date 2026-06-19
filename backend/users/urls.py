from django.urls import path
from users.views import UserMeView, AvatarUploadView, SendAnnouncementView, QuickParentEnrollView

urlpatterns = [
    path('me/', UserMeView.as_view(), name='user-me'),
    path('avatar/', AvatarUploadView.as_view(), name='user-avatar'),
    path('announcement/', SendAnnouncementView.as_view(), name='send-announcement'),
    path('quick-parent/', QuickParentEnrollView.as_view(), name='quick-parent-enroll'),
]
