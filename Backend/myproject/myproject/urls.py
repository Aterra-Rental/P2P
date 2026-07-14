from django.contrib import admin
from django.urls import path
from users.views import profile, register, login_view
from deal_tracker.views import user_deals, create_deal, update_deal_status

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/user/profile/', profile),
    path('api/register/', register),
    path('api/login/', login_view),
    
    path('api/user/deals/', user_deals),
    path('api/deal/create/', create_deal),
    path('api/deal/<int:deal_id>/status/', update_deal_status),
]