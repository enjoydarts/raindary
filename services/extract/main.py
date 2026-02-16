from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
import trafilatura
import requests

app = FastAPI(
    title="Raindrop AI - Extract Service",
    description="記事本文抽出サービス (trafilatura)",
    version="1.0.0"
)


class ExtractRequest(BaseModel):
    """抽出リクエスト"""
    url: HttpUrl


class ExtractResponse(BaseModel):
    """抽出レスポンス"""
    title: str
    text: str
    length: int
    language: str  # 必須フィールド
    method: str = "trafilatura"


@app.get("/health")
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "healthy", "service": "extract"}


@app.post("/extract", response_model=ExtractResponse)
async def extract_content(request: ExtractRequest):
    """
    URLから記事本文を抽出

    Args:
        request: 抽出対象のURL

    Returns:
        ExtractResponse: 抽出結果（タイトル、本文、文字数、言語）

    Raises:
        HTTPException: 404 - コンテンツが見つからない
        HTTPException: 422 - 抽出に失敗
        HTTPException: 500 - その他のエラー
    """
    print(f"[extract] Received request for URL: {request.url}")
    try:
        # URLからコンテンツをダウンロード
        # まずrequestsで直接ダウンロードを試行（User-Agent設定）
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        try:
            response = requests.get(str(request.url), headers=headers, timeout=15)
            response.raise_for_status()
            downloaded = response.text
        except requests.RequestException as e:
            print(f"[extract] HTTP request failed for URL: {request.url}, error: {e}")
            # requestsで失敗した場合はtrafilaturaのデフォルトfetch_urlを試す
            downloaded = trafilatura.fetch_url(str(request.url))

        if not downloaded:
            print(f"[extract] Failed to download URL: {request.url}")
            raise HTTPException(
                status_code=404,
                detail="記事の内容を取得できませんでした。サイトがログインを要求している、JavaScriptが必要、またはアクセスがブロックされている可能性があります。"
            )

        # 本文を抽出（JSON形式で取得）
        result = trafilatura.extract(
            downloaded,
            include_comments=False,
            include_tables=False,
            output_format="json"
        )

        if not result:
            print(f"[extract] Extraction failed for URL: {request.url}")
            raise HTTPException(
                status_code=422,
                detail="Extraction failed - content may not be an article"
            )

        # JSON文字列をパース
        import json
        data = json.loads(result)

        # データを取得してNoneチェック
        title = data.get("title") or ""
        text = data.get("text") or ""
        language = data.get("language") or "unknown"  # Noneまたは空文字列を"unknown"に変換

        # レスポンスを構築
        return ExtractResponse(
            title=title,
            text=text,
            length=len(text),
            language=language,
        )

    except HTTPException:
        # HTTPExceptionはそのまま再送出
        raise
    except Exception as e:
        # その他のエラーは500として返す
        print(f"[extract] Exception for URL {request.url}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "service": "Raindrop AI - Extract Service",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "extract": "/extract (POST)"
        }
    }
