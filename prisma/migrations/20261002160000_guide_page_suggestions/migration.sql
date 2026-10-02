-- The AI guide knows which page a visitor is on (V1 guide audit, 2026-10-02),
-- so its chat opens with questions about that page first. Data, not code:
-- the "ai-guide" content block gains pageSuggestions (Admin → Page content →
-- AI guide). Added only where the owner hasn't set any.

UPDATE "SiteContent"
   SET "body" = "body" || jsonb_build_object('pageSuggestions', $json$[
     { "page": "/systems/", "questions": ["What problem does this system solve, and how?", "Walk me through how it's built.", "What does this system prove about him?"] },
     { "page": "/systems", "questions": ["Which system should I look at first, and why?", "What has he built with AI?"] },
     { "page": "/journey", "questions": ["Walk me through his journey so far.", "What is he building alongside his degree?"] },
     { "page": "/about", "questions": ["What makes him different as an engineer?", "Show me the evidence behind his principles."] },
     { "page": "/contact", "questions": ["Help me write a message to him.", "What should I include if I'm hiring?"] }
   ]$json$::jsonb)
 WHERE "key" = 'ai-guide' AND NOT ("body" ? 'pageSuggestions');
