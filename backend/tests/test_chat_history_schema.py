import unittest
from datetime import datetime

from backend.schemas.ui import ChatHistoryItem, ChatHistoryResponse


class ChatHistorySchemaTest(unittest.TestCase):
    def test_schema_roundtrip(self):
        item = ChatHistoryItem(role="user", message="hello", created_at=datetime.utcnow())
        response = ChatHistoryResponse(items=[item])
        self.assertEqual(len(response.items), 1)
        self.assertEqual(response.items[0].role, "user")


if __name__ == "__main__":
    unittest.main()
