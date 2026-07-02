from django.contrib import admin
from django.urls import path
from users.views import profile, register, login_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/profile/', profile),
    path('api/register/', register),
    path('api/login/', login_view),
]