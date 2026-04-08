import os
from typing import Any

from pymongo import ASCENDING, MongoClient
from pymongo.collection import Collection
from pymongo.database import Database

_client: MongoClient[Any] | None = None
_database: Database[Any] | None = None
_users_index_ready = False


def get_mongo_client() -> MongoClient[Any]:
    uri = os.getenv("MONGODB_URI", "").strip()
    if not uri:
        raise RuntimeError("Missing MONGODB_URI in environment.")

    global _client
    if _client is None:
        _client = MongoClient(
            uri,
            serverSelectionTimeoutMS=5000,
            appname="AgenticInterviewCopilot",
        )

    return _client


def get_database() -> Database[Any]:
    db_name = os.getenv("MONGODB_DB_NAME", "interview_copilot").strip() or "interview_copilot"

    global _database
    if _database is None:
        _database = get_mongo_client()[db_name]

    return _database


def get_users_collection() -> Collection[Any]:
    users = get_database()["users"]

    global _users_index_ready
    if not _users_index_ready:
        users.create_index([("email", ASCENDING)], unique=True, name="uniq_users_email")
        _users_index_ready = True

    return users
