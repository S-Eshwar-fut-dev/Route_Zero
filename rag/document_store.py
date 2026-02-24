import os
import pathway as pw
from pathway.xpacks.llm.splitters import TokenCountSplitter
from pathway.xpacks.llm.embedders import OpenAIEmbedder
from pathway.xpacks.llm.document_store import DocumentStore

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def build_document_store() -> DocumentStore:
    """Build a Pathway Document Store over the /data directory.

    Uses streaming file ingestion with auto-update on file change.
    Applies token-based chunking and OpenAI/Gemini-compatible embeddings.
    Supports BM25 + semantic hybrid retrieval.
    """
    docs = pw.io.plaintext.read(
        os.path.abspath(DATA_DIR),
        mode="streaming",
        with_metadata=True,
    )

    splitter = TokenCountSplitter(max_tokens=400, min_tokens=50)

    embedder = OpenAIEmbedder(
        model="text-embedding-3-small",
        api_key=os.environ.get("GEMINI_API_KEY", os.environ.get("OPENAI_API_KEY", "")),
    )

    store = DocumentStore(
        docs=docs,
        splitter=splitter,
        embedder=embedder,
    )

    return store
