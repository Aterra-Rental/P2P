from django.http import JsonResponse
from users.models import UserToken
from .models import Deal

def get_user_from_token(request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token_str = auth_header.split(" ")[1]
    try:
        return UserToken.objects.get(token=token_str).user
    except UserToken.DoesNotExist:
        return None

def user_deals(request):
    user = get_user_from_token(request)
    if user is None:
        return JsonResponse({"error": "invalid or missing token"}, status=401)

    deals = Deal.objects.filter(buyer=user) | Deal.objects.filter(seller=user)
    deals = deals.order_by('-created_at')

    data = [
        {
            "id": d.id,
            "item_name": d.item_name,
            "price": str(d.price),
            "status": d.status,
        }
        for d in deals
    ]
    return JsonResponse(data, safe=False)