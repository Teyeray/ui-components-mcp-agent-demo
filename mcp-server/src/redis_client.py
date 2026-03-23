"""Redis client for publishing messages."""

import json
from typing import Any, Dict, Optional

from redis.asyncio import Redis


# TODO 放到 dp.agent.ui.mq.redis.producer
class RedisClient:
    """Async Redis client for message publishing."""
    
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.redis: Optional[Redis] = None
    
    async def connect(self):
        """Connect to Redis."""
        if not self.redis:
            self.redis = Redis.from_url(self.redis_url)
        
    async def disconnect(self):
        """Disconnect from Redis."""
        if self.redis:
            await self.redis.close()
    
    async def publish_message(self, channel: str, message: Dict[str, Any]):
        """Publish a message to a Redis channel."""
        if not self.redis:
            await self.connect()
        
        message_json = json.dumps(message)
        await self.redis.publish(channel, message_json)
        print(f"Published message to {channel}: {message_json}")
