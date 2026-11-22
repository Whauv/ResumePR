from __future__ import annotations

import json
from functools import lru_cache

import firebase_admin
from firebase_admin import auth, credentials

from resumepr_api.config import get_settings


@lru_cache(maxsize=1)
def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = get_settings().firebase_service_account_json
    if not service_account_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not set.")

    cred_info = json.loads(service_account_json)
    cred = credentials.Certificate(cred_info)
    return firebase_admin.initialize_app(cred)


def verify_bearer_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)
