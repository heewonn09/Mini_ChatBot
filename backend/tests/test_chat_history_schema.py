import unittest
from datetime import datetime

try:
    from backend.schemas.ui import ChatHistoryItem, ChatHistoryResponse
except ModuleNotFoundError:  # pragma: no cover - optional dependency guard for lightweight CI
    ChatHistoryItem = None
    ChatHistoryResponse = None


@unittest.skipIf(ChatHistoryItem is None or ChatHistoryResponse is None, "pydantic/backend deps not installed")
class ChatHistorySchemaTest(unittest.TestCase):
    def test_schema_roundtrip(self):
        item = ChatHistoryItem(role="user", message="hello", created_at=datetime.utcnow())
        response = ChatHistoryResponse(items=[item])
        self.assertEqual(len(response.items), 1)
        self.assertEqual(response.items[0].role, "user")


if __name__ == "__main__":
    unittest.main()
