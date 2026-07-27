from django.contrib import admin
from django.urls import path

# Auth Endpoints (from users app)
from users.views import (
    register,
    login_view,
)

# Deal & Profile Endpoints (from deal_tracker app)
from deal_tracker.views import (
    profile,
    user_deals,
    create_deal,
    update_deal_status,
    delete_deal,
    verify_user,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', register, name='register'),
    path('api/login/', login_view, name='login'),
    path('api/profile/<str:user_id>/', profile, name='profile'),
    path('api/Dashboard/profile/', profile, name='profile_dashboard'),
    path('api/Dashboard/deals/', user_deals, name='user_deals'),
    path('api/deal/create/', create_deal, name='create_deal'),
    path('api/deal/<int:deal_id>/status/', update_deal_status, name='update_deal_status'),
    path('api/deal/<int:deal_id>/delete/', delete_deal, name='delete_deal'),
    path('api/users/verify/', verify_user, name='verify_user'),
]
