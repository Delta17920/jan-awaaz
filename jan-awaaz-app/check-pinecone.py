from pinecone import Pinecone
import os

# Initialize Pinecone
pc = Pinecone(api_key="pcsk_6yVKVT_6Tq9qhxHiRTKDp1ttJpBmAuuNdkyWrNyGoNyBrPNQu4y2kBV8ShL9kfqARxNTnV")

# Connect to index
index = pc.Index("jan-awaaz-schemes", host="https://jan-awaaz-schemes-8fofp69.svc.aped-4627-b74a.pinecone.io")

# Check index stats
stats = index.describe_index_stats()
print("Pinecone Index Stats:")
print(f"Total vectors: {stats['total_vector_count']}")
print(f"Dimension: {stats.get('dimension', 'N/A')}")
print(f"Namespaces: {stats.get('namespaces', {})}")
