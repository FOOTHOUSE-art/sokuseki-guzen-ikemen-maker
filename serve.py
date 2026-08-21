"""キャッシュを無効にするローカルサーバ。
ブラウザが古い JS を掴んだままだと、修正が反映されていないように見える。"""
import http.server, socketserver, functools

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

if __name__ == '__main__':
    with socketserver.TCPServer(('', 8000), NoCache) as httpd:
        print('http://localhost:8000/  (Ctrl+C で停止)')
        httpd.serve_forever()
