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

# Room & Message Endpoints (from p2p_deal_app)
from p2p_deal_app.routes.room import (
    create_room,
    get_room,
    get_messages,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # Auth Endpoints
    path('api/register/', register, name='register'),
    path('api/login/', login_view, name='login'),

    # Profile Endpoints
    path('api/profile/<str:user_id>/', profile, name='profile'),
    path('api/Dashboard/profile/', profile, name='profile_dashboard'),

    # Deal Endpoints
    path('api/Dashboard/deals/', user_deals, name='user_deals'),
    path('api/deal/create/', create_deal, name='create_deal'),
    path('api/deal/<int:deal_id>/status/', update_deal_status, name='update_deal_status'),
    path('api/deal/<int:deal_id>/delete/', delete_deal, name='delete_deal'),
    path('api/users/verify/', verify_user, name='verify_user'),

    # Room & Messaging Endpoints
    path('api/rooms/', create_room, name='create_room'),
    path('api/rooms/<str:room_code>/', get_room, name='get_room'),
    path('api/rooms/<str:room_code>/messages/', get_messages, name='get_messages'),
    path('api/messages/', get_messages, name='save_message'),
]