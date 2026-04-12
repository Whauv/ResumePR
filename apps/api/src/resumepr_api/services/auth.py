from __future__ import annotations

import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import auth, credentials


@lru_cache(maxsize=1)
def get_firebase_app():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not service_account_json:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not set.")

    cred_info = json.loads(service_account_json)
    cred = credentials.Certificate(cred_info)
    return firebase_admin.initialize_app(cred)


def verify_bearer_token(id_token: str) -> dict:
    get_firebase_app()
    return auth.verify_id_token(id_token)
