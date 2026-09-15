-- 019: training & activation

CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kind VARCHAR(20) NOT NULL,                 -- core | safety | category
    category VARCHAR(50) REFERENCES service_categories(slug),
    slug VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE training_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
    slug VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    summary TEXT,
    video_url TEXT,
    transcript TEXT,
    examples JSONB NOT NULL DEFAULT '[]',      -- [{title, text, image_url?}]
    checklist JSONB NOT NULL DEFAULT '[]',     -- [{id, text}]
    duration_minutes INTEGER DEFAULT 5,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    is_placeholder BOOLEAN NOT NULL DEFAULT FALSE,   -- "Placeholder · pending SME review"
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_lessons_module ON training_lessons(module_id, sort_order);

CREATE TABLE quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,                    -- [{id:"a", text:"..."}, ...]
    correct_option VARCHAR(10) NOT NULL,
    is_critical BOOLEAN NOT NULL DEFAULT FALSE,
    explanation TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX idx_quiz_lesson ON quiz_questions(lesson_id);

CREATE TABLE training_progress (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
    watched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,                  -- lesson counted as done (quiz passed, or acknowledged if no quiz)
    best_score INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    passed_at TIMESTAMPTZ,
    training_version VARCHAR(20),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,
    score_pct INTEGER NOT NULL,
    passed BOOLEAN NOT NULL,
    critical_missed BOOLEAN NOT NULL DEFAULT FALSE,
    answers JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contractor_qualifications (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL REFERENCES service_categories(slug),
    status VARCHAR(20) NOT NULL DEFAULT 'training',  -- training | practical_pending | qualified | revoked
    qualified_at TIMESTAMPTZ,
    training_version VARCHAR(20),
    practical_job_id UUID REFERENCES jobs(id),
    practical_result VARCHAR(20),              -- pass | fail
    practical_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, category)
);

-- existing skills become qualifications in training (admin can flip them to qualified)
INSERT INTO contractor_qualifications (user_id, category, status)
SELECT cp.user_id, cs.skill_name, 'training' FROM contractor_skills cs JOIN contractor_profiles cp ON cp.id=cs.contractor_id
ON CONFLICT DO NOTHING;

ALTER TABLE jobs ADD COLUMN is_assessment BOOLEAN NOT NULL DEFAULT FALSE;   -- supervised first job

-- ---------- seed content ----------
INSERT INTO training_modules (kind, category, slug, title, description, sort_order) VALUES
 ('core',     NULL,           'core',        'Core: how MrBuilder works',            'Registration, job flow, the app and customer communication', 1),
 ('safety',   NULL,           'safety',      'Safety',                               'Site, ladder, tool and weather safety. Required before any job', 2),
 ('category', 'installation', 'installation','Installation',                         'Pergola installation: footings, mounting, louvers and accessories', 3),
 ('category', 'repair',       'repair',      'Repair',                               'Diagnosing and repairing louvers, motors, drainage and hardware', 4),
 ('category', 'maintenance',  'maintenance', 'Maintenance',                          'Seasonal maintenance visits', 5),
 ('category', 'cleaning',     'cleaning',    'Cleaning',                             'Cleaning louvered and fixed roofs, screens and glass', 6),
 ('category', 'programming',  'programming', 'Programming & Smart Controls',         'Remotes, sensors, app pairing and automation', 7),
 ('category', 'upgrades',     'upgrades',    'Upgrades & Accessories',               'Lighting, fans, heaters, screens (mounting only)', 8),
 ('category', 'inspection',   'inspection',  'Inspection & Diagnostics',             'Measuring, footing readiness and the inspection report', 9),
 ('category', 'removal',      'removal',     'Removal & Relocation',                 'Safe dismantling, transport and re-install', 10);

INSERT INTO training_lessons (module_id, slug, title, summary, duration_minutes, sort_order, is_placeholder, checklist) VALUES
 ((SELECT id FROM training_modules WHERE slug='core'), 'core-1', 'Welcome to MrBuilder',        'What MrBuilder is, who the customers are, what "PRO" means', 4, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='core'), 'core-2', 'The job flow',                'Marketplace → Accept → On my way → Arrived → Start → Complete → Paid', 6, 2, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='core'), 'core-3', 'Customer communication & evidence', 'Before-work photos, notes, chat, what never to promise', 6, 3, FALSE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-1',  'Personal protective equipment', 'Eye, hand, head and foot protection', 5, 1, FALSE, '[{"id":"ppe1","text":"Eye protection on before cutting or drilling"},{"id":"ppe2","text":"Gloves for handling louvers and hardware"}]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-2',  'Site assessment',          'Walk the site, identify hazards, customer notes', 5, 2, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-3',  'Ladders & lifts',          'Setup angle, three points of contact, inspection', 6, 3, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-4',  'Power tools',              'Cord inspection, guards, blade changes', 5, 4, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-5',  'Electrical, gas & plumbing boundaries', 'What MrBuilder contractors mount only and never wire', 5, 5, FALSE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-6',  'Weather',                  'Wind, rain, heat and when to stop work', 4, 6, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-7',  'Lifting & manual handling', 'Two-person lifts, posture', 4, 7, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-8',  'Working at height',        'Fall protection basics', 5, 8, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-9',  'Customers, pets & bystanders', 'Keeping the work zone clear', 3, 9, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='safety'), 'safety-10', 'Stop work & report a safety issue', 'When to pause, how to report, what the customer sees', 5, 10, FALSE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='installation'), 'inst-1', 'Footings & mounting surface', 'Verifying footings, attached vs free-standing', 8, 1, FALSE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='installation'), 'inst-2', 'Frame & posts',            'Assembly sequence, levelling', 8, 2, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='installation'), 'inst-3', 'Louvers & drainage',       'Louver install, gutters, drainage test', 8, 3, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='installation'), 'inst-4', 'Accessories (mount only)', 'LED, fans, heaters, screens — mounting without wiring', 6, 4, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='repair'),      'rep-1',  'Diagnosis basics',         'Louver, motor, drainage and hardware faults', 8, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='maintenance'), 'maint-1','Maintenance visit',        'What a visit covers', 6, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='cleaning'),    'clean-1','Cleaning methods',         'Products, pressure, screens and glass', 5, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='programming'), 'prog-1', 'Controls & pairing',       'Remotes, sensors, app pairing', 6, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='upgrades'),    'upg-1',  'Upgrade visits',           'Adding accessories to an existing pergola', 5, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='inspection'),  'insp-1', 'The inspection report',    'Measuring W×L×H, footings, labelled photos, scope tags', 8, 1, TRUE, '[]'),
 ((SELECT id FROM training_modules WHERE slug='removal'),     'rem-1',  'Dismantling & relocation', 'Order of removal, transport, re-install', 6, 1, TRUE, '[]');

-- Manufacturer references (placeholders until real brand content is supplied)
INSERT INTO training_lessons (module_id, slug, title, summary, duration_minutes, sort_order, is_placeholder, manufacturer, model) VALUES
 ((SELECT id FROM training_modules WHERE slug='installation'), 'mfr-a-1', 'Manufacturer A · Model 1', 'Manufacturer reference', 10, 20, TRUE, 'Manufacturer A', 'Model 1'),
 ((SELECT id FROM training_modules WHERE slug='installation'), 'mfr-b-1', 'Manufacturer B · Model 1', 'Manufacturer reference', 10, 21, TRUE, 'Manufacturer B', 'Model 1'),
 ((SELECT id FROM training_modules WHERE slug='repair'),       'mfr-c-1', 'Manufacturer C · Model 1', 'Manufacturer reference', 10, 20, TRUE, 'Manufacturer C', 'Model 1');

-- Authored quizzes: core-3, safety-1, safety-5, safety-10, inst-1 (5 questions each)
INSERT INTO quiz_questions (lesson_id, question, options, correct_option, is_critical, explanation, sort_order) VALUES
 ((SELECT id FROM training_lessons WHERE slug='core-3'), 'Before tapping "Start job" you must upload at least:', '[{"id":"a","text":"1 photo"},{"id":"b","text":"3 work-area photos and 1 product photo"},{"id":"c","text":"Nothing, photos are optional"},{"id":"d","text":"A video walkthrough"}]', 'b', TRUE, 'Start is blocked until the before-work evidence rule is met.', 1),
 ((SELECT id FROM training_lessons WHERE slug='core-3'), 'You notice a cracked footing before starting. What do you do?', '[{"id":"a","text":"Ignore it, it is not your job"},{"id":"b","text":"Photograph it as damage with a note before starting"},{"id":"c","text":"Repair it and add it to the invoice"},{"id":"d","text":"Start and mention it later"}]', 'b', TRUE, 'Pre-existing damage must be recorded before Start; it protects you in disputes.', 2),
 ((SELECT id FROM training_lessons WHERE slug='core-3'), 'A customer asks you to quote extra work directly. You should:', '[{"id":"a","text":"Give them a cash price"},{"id":"b","text":"Tell them to submit a new request in the app; MrBuilder prices the job"},{"id":"c","text":"Add it to the current job silently"},{"id":"d","text":"Refuse to talk about it"}]', 'b', FALSE, 'Quotes are system-generated only. Contractors never set prices.', 3),
 ((SELECT id FROM training_lessons WHERE slug='core-3'), 'Who can approve completion and release payment?', '[{"id":"a","text":"Anyone at the property"},{"id":"b","text":"The household member who let you in"},{"id":"c","text":"Only the account that placed the request"},{"id":"d","text":"The contractor"}]', 'c', FALSE, 'Household members can acknowledge, only the account owner approves.', 4),
 ((SELECT id FROM training_lessons WHERE slug='core-3'), 'Completion requires:', '[{"id":"a","text":"At least 2 photos and a completion note"},{"id":"b","text":"A signature"},{"id":"c","text":"A phone call to support"},{"id":"d","text":"Nothing"}]', 'a', FALSE, 'Completion evidence is shared with the customer.', 5),
 ((SELECT id FROM training_lessons WHERE slug='safety-1'), 'When must eye protection be worn?', '[{"id":"a","text":"Only when the customer is watching"},{"id":"b","text":"Whenever cutting, drilling or grinding"},{"id":"c","text":"Only indoors"},{"id":"d","text":"Never, it reduces visibility"}]', 'b', TRUE, NULL, 1),
 ((SELECT id FROM training_lessons WHERE slug='safety-1'), 'A hard hat is required when:', '[{"id":"a","text":"Working under overhead loads or lifts"},{"id":"b","text":"Driving to the job"},{"id":"c","text":"Talking to the customer"},{"id":"d","text":"Never"}]', 'a', TRUE, NULL, 2),
 ((SELECT id FROM training_lessons WHERE slug='safety-1'), 'Which footwear is acceptable on site?', '[{"id":"a","text":"Sandals"},{"id":"b","text":"Running shoes"},{"id":"c","text":"Closed, slip-resistant, protective-toe boots"},{"id":"d","text":"Any footwear"}]', 'c', FALSE, NULL, 3),
 ((SELECT id FROM training_lessons WHERE slug='safety-1'), 'Gloves should be:', '[{"id":"a","text":"Worn for louver and hardware handling, removed near rotating tools"},{"id":"b","text":"Always worn, including with rotating tools"},{"id":"c","text":"Never worn"},{"id":"d","text":"Optional"}]', 'a', FALSE, NULL, 4),
 ((SELECT id FROM training_lessons WHERE slug='safety-1'), 'Your PPE is damaged. You should:', '[{"id":"a","text":"Use it anyway"},{"id":"b","text":"Replace it before starting work"},{"id":"c","text":"Borrow the customer''s"},{"id":"d","text":"Work faster"}]', 'b', FALSE, NULL, 5),
 ((SELECT id FROM training_lessons WHERE slug='safety-5'), 'A customer asks you to wire the LED strip into the house circuit. You:', '[{"id":"a","text":"Do it, it is quick"},{"id":"b","text":"Mount only; wiring must be done by a licensed electrician"},{"id":"c","text":"Charge extra and do it"},{"id":"d","text":"Ask the customer to do it"}]', 'b', TRUE, 'Mounting only — no electrical, gas or plumbing work in MrBuilder scope.', 1),
 ((SELECT id FROM training_lessons WHERE slug='safety-5'), 'A gas heater is in scope for:', '[{"id":"a","text":"Full installation including gas line"},{"id":"b","text":"Mounting only"},{"id":"c","text":"Nothing, refuse the job"},{"id":"d","text":"Testing the gas line"}]', 'b', TRUE, NULL, 2),
 ((SELECT id FROM training_lessons WHERE slug='safety-5'), 'You find exposed live wiring near the mounting point. You:', '[{"id":"a","text":"Tape it and continue"},{"id":"b","text":"Stop work, report a safety issue in the app"},{"id":"c","text":"Ask the customer to hold it"},{"id":"d","text":"Work around it quickly"}]', 'b', TRUE, NULL, 3),
 ((SELECT id FROM training_lessons WHERE slug='safety-5'), 'Who is responsible for the electrical connection of accessories?', '[{"id":"a","text":"The contractor"},{"id":"b","text":"MrBuilder"},{"id":"c","text":"The customer, via a licensed electrician"},{"id":"d","text":"Nobody"}]', 'c', FALSE, NULL, 4),
 ((SELECT id FROM training_lessons WHERE slug='safety-5'), 'Drilling near a wall: before you drill you must:', '[{"id":"a","text":"Check for hidden cables and pipes"},{"id":"b","text":"Ask the dog to move"},{"id":"c","text":"Nothing"},{"id":"d","text":"Use the largest bit"}]', 'a', FALSE, NULL, 5),
 ((SELECT id FROM training_lessons WHERE slug='safety-10'), 'Wind picks up and your ladder is unstable. You:', '[{"id":"a","text":"Hurry to finish"},{"id":"b","text":"Tap Stop work / Report a safety issue and wait"},{"id":"c","text":"Ask the customer to hold the ladder"},{"id":"d","text":"Cancel the job"}]', 'b', TRUE, 'Pausing for safety never costs you a fee.', 1),
 ((SELECT id FROM training_lessons WHERE slug='safety-10'), 'When you pause for safety, the customer sees:', '[{"id":"a","text":"Nothing"},{"id":"b","text":"\"Work paused for safety\" and support is notified"},{"id":"c","text":"A cancellation"},{"id":"d","text":"An invoice"}]', 'b', FALSE, NULL, 2),
 ((SELECT id FROM training_lessons WHERE slug='safety-10'), 'Does a safety pause affect your rating or fees?', '[{"id":"a","text":"Yes, 5% fee"},{"id":"b","text":"Yes, rating drops"},{"id":"c","text":"No"},{"id":"d","text":"Only if longer than 1 hour"}]', 'c', FALSE, NULL, 3),
 ((SELECT id FROM training_lessons WHERE slug='safety-10'), 'You resume work by:', '[{"id":"a","text":"Tapping Resume work in the app once it is safe"},{"id":"b","text":"Calling the customer"},{"id":"c","text":"Creating a new job"},{"id":"d","text":"Nothing, it resumes automatically"}]', 'a', FALSE, NULL, 4),
 ((SELECT id FROM training_lessons WHERE slug='safety-10'), 'A minor injury on site should be:', '[{"id":"a","text":"Ignored"},{"id":"b","text":"Reported through the safety issue flow"},{"id":"c","text":"Posted on social media"},{"id":"d","text":"Billed to the customer"}]', 'b', TRUE, NULL, 5),
 ((SELECT id FROM training_lessons WHERE slug='inst-1'), 'Footings are marked "Ready (4)" in the request. On site you find 3. You:', '[{"id":"a","text":"Pour the 4th yourself"},{"id":"b","text":"Photograph, note it, and contact support before Start"},{"id":"c","text":"Install on 3"},{"id":"d","text":"Cancel"}]', 'b', TRUE, 'Footing construction is outside MrBuilder scope.', 1),
 ((SELECT id FROM training_lessons WHERE slug='inst-1'), 'Attached mounting requires:', '[{"id":"a","text":"A ledger fixed into structural framing, not only siding"},{"id":"b","text":"Glue"},{"id":"c","text":"Two screws"},{"id":"d","text":"No fixing"}]', 'a', TRUE, NULL, 2),
 ((SELECT id FROM training_lessons WHERE slug='inst-1'), 'Before drilling into a wall you check:', '[{"id":"a","text":"Paint colour"},{"id":"b","text":"Hidden services and structural members"},{"id":"c","text":"Nothing"},{"id":"d","text":"The weather forecast"}]', 'b', FALSE, NULL, 3),
 ((SELECT id FROM training_lessons WHERE slug='inst-1'), 'Free-standing pergola posts must be:', '[{"id":"a","text":"Level and plumb, anchored to each footing"},{"id":"b","text":"Placed on grass"},{"id":"c","text":"Left loose until the roof is on"},{"id":"d","text":"Glued"}]', 'a', FALSE, NULL, 4),
 ((SELECT id FROM training_lessons WHERE slug='inst-1'), 'The customer''s request says 12×10×9 ft. Your tape says 12×10×8. You:', '[{"id":"a","text":"Install at 8 and say nothing"},{"id":"b","text":"Record the measured dimension and note it before Start"},{"id":"c","text":"Cut the posts"},{"id":"d","text":"Refuse the job"}]', 'b', FALSE, NULL, 5);
