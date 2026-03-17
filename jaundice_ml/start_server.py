#!/usr/bin/env python3
"""
Simple script to start the Neonatal Jaundice API server
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    try:
        import uvicorn
        from api.app import app
        
        print("🚀 Starting Neonatal Jaundice API Server...")
        print("📍 Server will be available at: http://localhost:8000")
        print("📍 Health check: http://localhost:8000/health")
        print("📍 API docs: http://localhost:8000/docs")
        print("⏹️  Press Ctrl+C to stop the server")
        print("-" * 50)
        
        uvicorn.run(
            "api.app:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install required packages:")
        print("pip install fastapi uvicorn python-multipart")
        sys.exit(1)
        
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        sys.exit(1)
