#!/usr/bin/env python3
"""
RAG Service for ICP Coder
Provides context retrieval from ChromaDB vector store
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
from chromadb.config import Settings
import os

app = Flask(__name__)
CORS(app)

# Initialize ChromaDB client
chroma_host = os.getenv("CHROMA_HOST", "localhost")
chroma_port = int(os.getenv("CHROMA_PORT", "8000"))
chroma_client = chromadb.HttpClient(
    host=chroma_host,
    port=chroma_port,
    settings=Settings(allow_reset=True, anonymized_telemetry=False)
)

# Get or create collection
collection = chroma_client.get_or_create_collection(
    name="motoko_docs",
    metadata={"description": "Motoko documentation and code samples"}
)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

@app.route("/api/v1/context", methods=["POST"])
def get_context():
    """Retrieve relevant Motoko context based on query"""
    data = request.get_json()
    query = data.get("query", "")
    limit = data.get("limit", 5)

    if not query:
        return jsonify({"error": "query is required"}), 400

    try:
        # Query ChromaDB
        results = collection.query(
            query_texts=[query],
            n_results=limit
        )

        # Format results
        formatted_results = []
        if results["ids"] and len(results["ids"][0]) > 0:
            for i in range(len(results["ids"][0])):
                formatted_results.append({
                    "content": results["documents"][0][i] if results["documents"] else "",
                    "source": results["metadatas"][0][i].get("source", "Unknown") if results["metadatas"] else "Unknown",
                    "score": 1.0 - results["distances"][0][i] if results["distances"] else 0.0,
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {}
                })

        return jsonify({"results": formatted_results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/v1/ingest", methods=["POST"])
def ingest_documents():
    """Ingest documents into ChromaDB (admin only)"""
    data = request.get_json()
    documents = data.get("documents", [])
    
    if not documents:
        return jsonify({"error": "documents array is required"}), 400

    try:
        ids = []
        texts = []
        metadatas = []
        
        for i, doc in enumerate(documents):
            ids.append(doc.get("id", f"doc_{i}"))
            texts.append(doc.get("text", ""))
            metadatas.append(doc.get("metadata", {}))

        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas
        )

        return jsonify({"message": f"Added {len(documents)} documents"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=True)
