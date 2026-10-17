from __future__ import annotations

from flask.wrappers import Request


class AppRequest(Request):
    @property
    def max_content_length(self) -> int | None:
        request_limit = self.environ.get("shelight.max_content_length")
        if request_limit is not None:
            return int(request_limit)
        return super().max_content_length
