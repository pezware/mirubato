PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO d1_migrations VALUES(1,'0001_create_users.sql','2025-06-02 01:34:22');
INSERT INTO d1_migrations VALUES(2,'0002_create_user_preferences.sql','2025-06-02 01:34:22');
INSERT INTO d1_migrations VALUES(3,'0003_create_sheet_music.sql','2025-06-02 01:34:22');
INSERT INTO d1_migrations VALUES(4,'0004_create_practice_sessions.sql','2025-06-02 01:34:23');
INSERT INTO d1_migrations VALUES(5,'0005_create_practice_logs.sql','2025-06-02 01:34:23');
INSERT INTO d1_migrations VALUES(6,'0006_create_logbook_entries.sql','2025-06-11 01:16:27');
INSERT INTO d1_migrations VALUES(7,'0007_create_goals.sql','2025-06-11 01:16:28');
INSERT INTO d1_migrations VALUES(8,'0008_create_sync_metadata.sql','2025-06-16 15:25:22');
INSERT INTO d1_migrations VALUES(9,'0009_add_device_tracking.sql','2025-06-18 01:43:28');
INSERT INTO d1_migrations VALUES(10,'0010_add_api_compatibility.sql','2025-06-22 18:42:21');
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  primary_instrument TEXT NOT NULL DEFAULT 'PIANO' CHECK (primary_instrument IN ('PIANO', 'GUITAR')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, auth_provider TEXT DEFAULT 'magic_link' CHECK (auth_provider IN ('magic_link', 'google')), google_id TEXT);
INSERT INTO users VALUES('user_V8-Dtc9t5RHOdSiH-eJZY','andy@ictocruz.com',NULL,'PIANO','2025-06-03T04:54:21.310Z','2025-06-03T04:54:21.310Z','magic_link',NULL);
INSERT INTO users VALUES('user_Z_djK1xo_IicL70UqanqJ','andyxiang.work@gmail.com','Andy Xiang','PIANO','2025-06-03T04:57:26.002Z','2025-06-25 03:50:45','google','103365456624937708104');
INSERT INTO users VALUES('user_PYK6JhK-dQb0JoW-Iixev','andy@mirubato.com',NULL,'PIANO','2025-06-08T01:28:45.613Z','2025-06-08T01:28:45.613Z','magic_link',NULL);
INSERT INTO users VALUES('user_KiAmrHWo1fzgpZ9r0u5Yy','andy@pezware.com',NULL,'PIANO','2025-06-10T15:19:58.887Z','2025-06-10T15:19:58.887Z','magic_link',NULL);
INSERT INTO users VALUES('user_Oz_JA2ExxtY3WXJ83rxlC','Exit42@gmail.com',NULL,'PIANO','2025-06-11T18:29:42.158Z','2025-06-11T18:29:42.158Z','magic_link',NULL);
INSERT INTO users VALUES('user_ANwtZd1XrmABU7W1bW5yf','exit42@gmail.com','Ann Xiang','PIANO','2025-06-24 04:06:52','2025-06-24 04:06:52','google','114710027039213421941');
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences TEXT NOT NULL, 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO user_preferences VALUES('user_V8-Dtc9t5RHOdSiH-eJZY','{"theme":"LIGHT","notationSize":"MEDIUM","practiceReminders":true,"dailyGoalMinutes":30}');
INSERT INTO user_preferences VALUES('user_Z_djK1xo_IicL70UqanqJ','{"theme":"LIGHT","notationSize":"MEDIUM","practiceReminders":true,"dailyGoalMinutes":30}');
INSERT INTO user_preferences VALUES('user_PYK6JhK-dQb0JoW-Iixev','{"theme":"LIGHT","notationSize":"MEDIUM","practiceReminders":true,"dailyGoalMinutes":30}');
INSERT INTO user_preferences VALUES('user_KiAmrHWo1fzgpZ9r0u5Yy','{"theme":"LIGHT","notationSize":"MEDIUM","practiceReminders":true,"dailyGoalMinutes":30}');
INSERT INTO user_preferences VALUES('user_Oz_JA2ExxtY3WXJ83rxlC','{"theme":"LIGHT","notationSize":"MEDIUM","practiceReminders":true,"dailyGoalMinutes":30}');
CREATE TABLE sheet_music (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  composer TEXT NOT NULL,
  opus TEXT,
  movement TEXT,
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
  grade_level TEXT,
  duration_seconds INTEGER NOT NULL,
  time_signature TEXT NOT NULL,
  key_signature TEXT NOT NULL,
  tempo_marking TEXT,
  suggested_tempo INTEGER NOT NULL,
  style_period TEXT NOT NULL CHECK (style_period IN ('BAROQUE', 'CLASSICAL', 'ROMANTIC', 'MODERN', 'CONTEMPORARY')),
  tags TEXT NOT NULL, 
  measures_data TEXT NOT NULL, 
  metadata TEXT, 
  thumbnail TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  sheet_music_id TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('FREE_PRACTICE', 'GUIDED_PRACTICE', 'ASSESSMENT')),
  started_at DATETIME NOT NULL,
  completed_at DATETIME,
  paused_duration INTEGER DEFAULT 0, 
  accuracy_percentage REAL,
  notes_attempted INTEGER DEFAULT 0,
  notes_correct INTEGER DEFAULT 0, sync_version INTEGER DEFAULT 1, checksum TEXT, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, deleted_at DATETIME, device_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (sheet_music_id) REFERENCES sheet_music(id)
);
CREATE TABLE practice_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('SIGHT_READING', 'SCALES', 'REPERTOIRE', 'ETUDES', 'TECHNIQUE', 'OTHER')),
  duration_seconds INTEGER NOT NULL,
  tempo_practiced INTEGER,
  target_tempo INTEGER,
  focus_areas TEXT, 
  self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 10),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE
);
CREATE TABLE logbook_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL, 
  duration INTEGER NOT NULL, 
  type TEXT NOT NULL CHECK (type IN ('PRACTICE', 'PERFORMANCE', 'LESSON', 'REHEARSAL')),
  instrument TEXT NOT NULL CHECK (instrument IN ('PIANO', 'GUITAR')),
  pieces TEXT NOT NULL DEFAULT '[]', 
  techniques TEXT NOT NULL DEFAULT '[]', 
  goal_ids TEXT NOT NULL DEFAULT '[]', 
  notes TEXT,
  mood TEXT CHECK (mood IN ('FRUSTRATED', 'NEUTRAL', 'SATISFIED', 'EXCITED')),
  tags TEXT NOT NULL DEFAULT '[]', 
  session_id TEXT,
  metadata TEXT, 
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL, sync_version INTEGER DEFAULT 1, checksum TEXT, deleted_at DATETIME, device_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE SET NULL
);
INSERT INTO logbook_entries VALUES('8UuSSTy6CdQhHE5ZyBW8t','user_Z_djK1xo_IicL70UqanqJ',1749564000000,3300,'LESSON','GUITAR','[]','["Articulation"]','[]','learn to focus. on minor improvements and on rundown concentration.','SATISFIED','[]',NULL,'{"source":"manual"}',1750007703107,1750007703107,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749603874243_wvu6tbee8','user_Z_djK1xo_IicL70UqanqJ',1749690240000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["technical"]',NULL,NULL,1750288584631,1750288584631,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749663505678_xyp1kr9pb','user_Z_djK1xo_IicL70UqanqJ',1749663480000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["warmup"]',NULL,NULL,1750288584680,1750288584680,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749603899309_41q3ukj48','user_Z_djK1xo_IicL70UqanqJ',1749647040000,1800,'LESSON','GUITAR','[{"id":"custom-1749603896376","title":"Sor Op60 #22"}]','[]','[]',NULL,'SATISFIED','[]',NULL,NULL,1750288584737,1750288584737,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749599202963_ygfpzqgnb','user_Z_djK1xo_IicL70UqanqJ',1749599160000,1800,'PRACTICE','PIANO','[]','[]','[]','i hope','NEUTRAL','["technical"]',NULL,NULL,1750288584784,1750288584784,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749599119978_4jfpb2fnl','user_Z_djK1xo_IicL70UqanqJ',1749564000000,3600,'LESSON','GUITAR','[{"id":"custom-1749599054379","title":"Sor Op60 #22"}]','["Articulation"]','[]',replace('correct mistakes during warm up. 15 minutes max. \nkeep concentration during run through. \nuse long sight reading to keep focus.','\n',char(10)),'SATISFIED','[]',NULL,NULL,1750288584834,1750288584834,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749747241072_ojx37xa10','user_Z_djK1xo_IicL70UqanqJ',1749747180000,1800,'PRACTICE','GUITAR','[]','[]','[]','Logged in test.','NEUTRAL','["technical"]',NULL,NULL,1750467693431,1750467693431,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749743961641_rcce87dso','user_Z_djK1xo_IicL70UqanqJ',1749743940000,1800,'PRACTICE','GUITAR','[]','["Sight-reading"]','[]','all sor''s piece','NEUTRAL','["repertoire"]',NULL,NULL,1750467693469,1750467693469,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749743866656_77orvx0dj','user_Z_djK1xo_IicL70UqanqJ',1749743820000,1800,'PRACTICE','GUITAR','[{"id":"custom-1749743865123","title":"basic","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'NEUTRAL','["technical"]',NULL,NULL,1750467693510,1750467693510,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('IUmr0mHTnVCTvYt-bAv9J','user_Oz_JA2ExxtY3WXJ83rxlC',1750559400000,7200,'PRACTICE','PIANO','[{"id":"custom-1750481012771","title":"Haydn Hob.8"},{"id":"custom-1750481030662","title":"Bach BWV 778"}]','["Scales"]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,'{"source":"manual"}',1750481039460,1750481039460,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749568650225_yvzh78759','user_Z_djK1xo_IicL70UqanqJ',1749568500000,3600,'LESSON','PIANO','[]','["Phrasing"]','[]',replace('slow fixing mistakes\nconcentration in run through ','\n',char(10)),'SATISFIED','[]',NULL,NULL,1750531386199,1750531386199,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749794091954_idaiys2bb','user_Z_djK1xo_IicL70UqanqJ',1749794040000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750531447475,1750531447475,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749696444961_5iccgdk2r','user_Z_djK1xo_IicL70UqanqJ',1749782820000,1800,'PRACTICE','GUITAR','[]','["Phrasing"]','[]',NULL,'NEUTRAL','["technical"]',NULL,NULL,1750531447557,1750531447557,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749771175098_dy4sm9h5c','user_Z_djK1xo_IicL70UqanqJ',1749771120000,1800,'PRACTICE','GUITAR','[]','["Interpretation"]','[]','test again','EXCITED','["technical"]',NULL,NULL,1750531447603,1750531447603,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749796380012_kzxbctnqj','user_Z_djK1xo_IicL70UqanqJ',1749796320000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750718465128,1750718465128,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749794746192_6yfqin2yh','user_Z_djK1xo_IicL70UqanqJ',1749794700000,1800,'REHEARSAL','GUITAR','[]','[]','[]',NULL,'FRUSTRATED','[]',NULL,NULL,1750718465175,1750718465175,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749794128318_6spaoxrej','user_Z_djK1xo_IicL70UqanqJ',1749794100000,1800,'REHEARSAL','GUITAR','[]','["Dynamics"]','[]',NULL,'NEUTRAL','[]',NULL,NULL,1750718465224,1750718465224,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749794100555_grfmf5b0j','user_Z_djK1xo_IicL70UqanqJ',1749794040000,1800,'REHEARSAL','PIANO','[]','[]','[]',NULL,'EXCITED','[]',NULL,NULL,1750718465280,1750718465280,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('_Y9HAhgMH6lp35VGFZum0','user_Z_djK1xo_IicL70UqanqJ',1750818840000,1800,'PRACTICE','PIANO','[]','[]','[]','old frontend','NEUTRAL','["repertoire"]',NULL,'{"source":"manual"}',1750732457226,1750732457226,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750718398262_d9hgz3xwx','user_Z_djK1xo_IicL70UqanqJ',1750718340000,1800,'LESSON','PIANO','[]','[]','[]',NULL,'NEUTRAL','[]',NULL,NULL,1750732460458,1750732460458,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750718391461_wfcijvkx7','user_Z_djK1xo_IicL70UqanqJ',1750718340000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["technical"]',NULL,NULL,1750732460509,1750732460509,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750695794976_nule9zoks','user_Z_djK1xo_IicL70UqanqJ',1750695780000,1800,'PRACTICE','PIANO','[]','["Memorization"]','[]','unlogged in local browser. old frontend','EXCITED','["repertoire"]',NULL,NULL,1750732460560,1750732460560,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('oAxHT4TAZAaLa2ezfDeO_','user_Z_djK1xo_IicL70UqanqJ',1750611960000,1800,'PRACTICE','GUITAR','[{"id":"custom-1750611994404","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'SATISFIED','["repertoire"]',NULL,NULL,1750732460605,1750732460605,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750611951515_s26sw6y4e','user_Z_djK1xo_IicL70UqanqJ',1750611900000,1800,'PRACTICE','GUITAR','[{"id":"custom-1750611947879","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'SATISFIED','["technical"]',NULL,NULL,1750732460650,1750732460650,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('urLMPa9XeSDukJHPzC1eA','user_Z_djK1xo_IicL70UqanqJ',1750611840000,1800,'PRACTICE','GUITAR','[]','[]','[]','basic','NEUTRAL','["repertoire"]',NULL,NULL,1750732460699,1750732460699,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('hrhoNZ9B82pjayIwzxJlZ','user_Z_djK1xo_IicL70UqanqJ',1750554060000,1800,'PRACTICE','GUITAR','[]','[]','[]','basic','SATISFIED','["repertoire"]',NULL,NULL,1750732460748,1750732460748,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('gy_3UQxXwO-EQugS8n_su','user_Z_djK1xo_IicL70UqanqJ',1750531380000,1800,'PRACTICE','PIANO','[]','[]','[]','from mobile','NEUTRAL','["repertoire"]',NULL,NULL,1750732460793,1750732460793,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('QFDInV-g6M9LZis7L5QI_','user_Z_djK1xo_IicL70UqanqJ',1750530720000,600,'PRACTICE','GUITAR','[]','[]','[]','just basic stuffs','NEUTRAL','["technical"]',NULL,NULL,1750732460838,1750732460838,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('0K1GUslcGOqhnpy1uYbDW','user_Z_djK1xo_IicL70UqanqJ',1750288500000,1800,'PRACTICE','GUITAR','[]','[]','[]','trying a new way','EXCITED','["repertoire"]',NULL,NULL,1750732460887,1750732460887,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('_r9G1lwcFphILrfZB7BV0','user_Z_djK1xo_IicL70UqanqJ',1750109940000,1800,'LESSON','PIANO','[]','[]','[]',NULL,'SATISFIED','[]',NULL,NULL,1750732460937,1750732460937,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750109944317_7zzb3lzgm','user_Z_djK1xo_IicL70UqanqJ',1750109880000,1800,'LESSON','PIANO','[]','[]','[]',NULL,'SATISFIED','[]',NULL,NULL,1750732460981,1750732460981,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('KPVNO2b1vPuQ-VEGmOfZ0','user_Z_djK1xo_IicL70UqanqJ',1750084920000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461026,1750732461026,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749950671285_g2tf7oyyu','user_Z_djK1xo_IicL70UqanqJ',1750037040000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'EXCITED','["technical"]',NULL,NULL,1750732461070,1750732461070,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('D0k5m1dUy3O3zAGixnRU_','user_Z_djK1xo_IicL70UqanqJ',1750008360000,1800,'PRACTICE','PIANO','[]','[]','[]','run down free speed.','NEUTRAL','["repertoire"]',NULL,NULL,1750732461115,1750732461115,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('zknNycVm3Js3SpVxz9zuw','user_Z_djK1xo_IicL70UqanqJ',1750005000000,2700,'PRACTICE','GUITAR','[{"id":"custom-1750004143508","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}]','[]','[]',replace('quater note 80-90\nslow, fluency, concentration.','\n',char(10)),'SATISFIED','["repertoire"]',NULL,NULL,1750732461161,1750732461161,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('xhm-EO-Xr3Qv4ndfN8ALE','user_Z_djK1xo_IicL70UqanqJ',1750003200000,600,'PRACTICE','GUITAR','[]','[]','[]','slurs','SATISFIED','["technical"]',NULL,NULL,1750732461206,1750732461206,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('DMx9VeulVyUBYQ2Z8gA_s','user_Z_djK1xo_IicL70UqanqJ',1750000920000,1200,'PRACTICE','GUITAR','[{"id":"custom-1750004087644","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'SATISFIED','["repertoire"]',NULL,NULL,1750732461254,1750732461254,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('mVcM-NipM0oiDdyAv3xMf','user_Z_djK1xo_IicL70UqanqJ',1750000200000,2400,'PRACTICE','GUITAR','[]','[]','[]',replace('single points. \nsight reading\nrun through from 80 step up.','\n',char(10)),'NEUTRAL','["repertoire"]',NULL,NULL,1750732461302,1750732461302,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('3y68YzES7L9rkgzIMEUJE','user_Z_djK1xo_IicL70UqanqJ',1749997800000,1800,'PRACTICE','GUITAR','[]','[]','[]',replace('basics, warm-up\nloud notes.','\n',char(10)),'NEUTRAL','["technical"]',NULL,NULL,1750732461349,1750732461349,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749875982461_4o32xt5k1','user_Z_djK1xo_IicL70UqanqJ',1749962340000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["technical"]',NULL,NULL,1750732461395,1750732461395,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749875617842_fy746h3ae','user_Z_djK1xo_IicL70UqanqJ',1749961980000,1800,'REHEARSAL','PIANO','[]','[]','[]',NULL,'FRUSTRATED','[]',NULL,NULL,1750732461442,1750732461442,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('AayaHPzSgVEBxUhZuhlsy','user_Z_djK1xo_IicL70UqanqJ',1749961920000,1800,'PRACTICE','GUITAR','[]','[]','[]','the day starts from here. and finish from here','EXCITED','["sight-reading"]',NULL,NULL,1750732461487,1750732461487,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('BP8Xyg6pmNBXjNOT2DRL4','user_Z_djK1xo_IicL70UqanqJ',1749957300000,1800,'PRACTICE','GUITAR','[]','[]','[]','slurs x3','NEUTRAL','["technical"]',NULL,NULL,1750732461533,1750732461533,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('A13OYzkNCrch3cAgqcr_1','user_Z_djK1xo_IicL70UqanqJ',1749939840000,1800,'LESSON','GUITAR','[]','[]','[]',NULL,'FRUSTRATED','[]',NULL,NULL,1750732461577,1750732461577,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749939808273_2n6mlqchf','user_Z_djK1xo_IicL70UqanqJ',1749939780000,1800,'REHEARSAL','GUITAR','[]','[]','[]',NULL,'NEUTRAL','[]',NULL,NULL,1750732461621,1750732461621,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('JP5Mz59pMHjDUUWAL-K6m','user_Z_djK1xo_IicL70UqanqJ',1749883380000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461668,1750732461668,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749883443854_9rh3eydah','user_Z_djK1xo_IicL70UqanqJ',1749883380000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461712,1750732461712,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749879517430_il31l1q4q','user_Z_djK1xo_IicL70UqanqJ',1749879480000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461757,1750732461757,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('RfGUlWh6Y2K_O7TLZLt-5','user_Z_djK1xo_IicL70UqanqJ',1749878940000,1800,'LESSON','PIANO','[]','[]','[]',NULL,'SATISFIED','[]',NULL,NULL,1750732461801,1750732461801,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749878933708_c0828k751','user_Z_djK1xo_IicL70UqanqJ',1749878880000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461846,1750732461846,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749790455098_3jeifc07p','user_Z_djK1xo_IicL70UqanqJ',1749876840000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461891,1750732461891,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749780523213_0g4i7ot9s','user_Z_djK1xo_IicL70UqanqJ',1749866880000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461938,1750732461938,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749780423346_gqosu6ybl','user_Z_djK1xo_IicL70UqanqJ',1749866760000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732461983,1750732461983,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749780285929_nn7vvvz31','user_Z_djK1xo_IicL70UqanqJ',1749866640000,1800,'PRACTICE','PIANO','[{"id":"custom-1749780282830","title":"Chopin","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462027,1750732462027,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('ETS9KFye4dyD5l-5YTY0R','user_Z_djK1xo_IicL70UqanqJ',1749831300000,1800,'PRACTICE','GUITAR','[]','[]','[]','why','NEUTRAL','["repertoire"]',NULL,NULL,1750732462070,1750732462070,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('-7CGN8hA9ftLBdpivs-jB','user_Z_djK1xo_IicL70UqanqJ',1749831300000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462117,1750732462117,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749829328560_hyj8nqaiv','user_Z_djK1xo_IicL70UqanqJ',1749829320000,1800,'REHEARSAL','PIANO','[]','[]','[]',NULL,'EXCITED','[]',NULL,NULL,1750732462160,1750732462160,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749828322657_n17mdyw95','user_Z_djK1xo_IicL70UqanqJ',1749828300000,1800,'PRACTICE','PIANO','[{"id":"custom-1749828320276","title":"New","composer":null,"measures":null,"tempo":null}]','[]','[]',NULL,'EXCITED','["repertoire"]',NULL,NULL,1750732462205,1750732462205,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749828135894_qiefuyak0','user_Z_djK1xo_IicL70UqanqJ',1749828120000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["sight-reading"]',NULL,NULL,1750732462249,1750732462249,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749828091379_ib3zvwmvf','user_Z_djK1xo_IicL70UqanqJ',1749828060000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462295,1750732462295,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749827904882_jb9qesvc6','user_Z_djK1xo_IicL70UqanqJ',1749827880000,1800,'PRACTICE','GUITAR','[{"id":"custom-1749827901279","title":"Sor","composer":null,"measures":null,"tempo":null}]','["Interpretation"]','[]',NULL,'FRUSTRATED','["technical"]',NULL,NULL,1750732462346,1750732462346,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('RpdoOfJOcOSHy2oGvIzz9','user_Z_djK1xo_IicL70UqanqJ',1749827820000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462391,1750732462391,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('1_8HGX3yqd2mrn3upAsX0','user_Z_djK1xo_IicL70UqanqJ',1749827820000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'EXCITED','["technical"]',NULL,NULL,1750732462442,1750732462442,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749798846003_c4xc7skh1','user_Z_djK1xo_IicL70UqanqJ',1749798840000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462501,1750732462501,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749798887484_gsr3q31sb','user_Z_djK1xo_IicL70UqanqJ',1749798840000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462546,1750732462546,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749798808985_ygcyblqnc','user_Z_djK1xo_IicL70UqanqJ',1749798780000,1800,'PRACTICE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462592,1750732462592,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749798801322_a8mvsr32k','user_Z_djK1xo_IicL70UqanqJ',1749798780000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462640,1750732462640,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749797184101_o5jhu3z6j','user_Z_djK1xo_IicL70UqanqJ',1749797160000,1800,'PERFORMANCE','GUITAR','[]','[]','[]',NULL,'NEUTRAL','[]',NULL,NULL,1750732462685,1750732462685,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1749797154655_lgu1p5iip','user_Z_djK1xo_IicL70UqanqJ',1749797100000,1800,'PRACTICE','PIANO','[]','[]','[]',NULL,'NEUTRAL','["repertoire"]',NULL,NULL,1750732462731,1750732462731,1,NULL,NULL,NULL);
INSERT INTO logbook_entries VALUES('entry_1750732506278_zlw9ne75n','user_Z_djK1xo_IicL70UqanqJ',1750818840000,1800,'PRACTICE','PIANO','[]','[]','[]','old fronend, not logged in','NEUTRAL','["repertoire"]',NULL,NULL,1750732547929,1750732547929,1,NULL,NULL,NULL);
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_date INTEGER, 
  progress REAL NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  milestones TEXT NOT NULL DEFAULT '[]', 
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED')),
  linked_entries TEXT NOT NULL DEFAULT '[]', 
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  completed_at INTEGER, sync_version INTEGER DEFAULT 1, checksum TEXT, deleted_at DATETIME, device_id TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE sync_metadata (
  user_id TEXT PRIMARY KEY,
  last_sync_timestamp INTEGER NOT NULL DEFAULT 0,
  sync_token TEXT,
  pending_sync_count INTEGER NOT NULL DEFAULT 0,
  last_sync_status TEXT NOT NULL DEFAULT 'never' CHECK (last_sync_status IN ('never', 'success', 'partial', 'failed')),
  last_sync_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
INSERT INTO sync_metadata VALUES('user_Z_djK1xo_IicL70UqanqJ',1750823187666,'user_Z_djK1xo_IicL70UqanqJ:1750823187666',0,'success',NULL,'2025-06-18 23:20:44','2025-06-25 03:46:27');
INSERT INTO sync_metadata VALUES('user_PYK6JhK-dQb0JoW-Iixev',1750353793718,'user_PYK6JhK-dQb0JoW-Iixev:1750353793718',0,'success',NULL,'2025-06-19 17:03:13','2025-06-19 17:23:13');
INSERT INTO sync_metadata VALUES('user_Oz_JA2ExxtY3WXJ83rxlC',1750482916151,'user_Oz_JA2ExxtY3WXJ83rxlC:1750482916151',0,'success',NULL,'2025-06-21 05:15:16','2025-06-21 05:15:16');
CREATE TABLE deleted_entities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  deleted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE device_info (
  device_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  operation TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  status TEXT NOT NULL,
  message TEXT,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE sync_data (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  data TEXT NOT NULL, 
  checksum TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, entity_type, entity_id)
);
INSERT INTO sync_data VALUES('sync_zJfTVwD1OAeZdTikDNoJl','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750717936586_s2u94h918','{"timestamp":"2025-06-23T22:32:16.586Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"online frontendv2 not displaying older entries. adding a new entry anyway. using google oauth","tags":[],"metadata":{"source":"manual"},"id":"entry_1750717936586_s2u94h918","createdAt":"2025-06-23T22:32:16.586Z","updatedAt":"2025-06-23T22:32:16.586Z"}','7403e32d81a073496c0217b62a8d6247bc54bf3af1fe30c632b2b3733e8f7b8c',1,'2025-06-23 22:32:17','2025-06-24 02:39:44',NULL);
INSERT INTO sync_data VALUES('sync_R1AP950uWEYQQZinzEAZL','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750717972797_0suwq20o8','{"timestamp":"2025-06-23T22:32:52.797Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750717972797_0suwq20o8","createdAt":"2025-06-23T22:32:52.797Z","updatedAt":"2025-06-23T22:32:52.797Z"}','0e4e121046a2fdb96e37289a533135c1256a08d4bd887be14aadfbfdf310e546',1,'2025-06-23 22:32:53','2025-06-24 02:39:44',NULL);
INSERT INTO sync_data VALUES('sync_Fm1FEQ_74rwopqq225ww6','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750718012455_7e66z42e2','{"timestamp":"2025-06-23T22:37:49.460Z","duration":30,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750718012455_7e66z42e2","createdAt":"2025-06-23T22:33:32.455Z","updatedAt":"2025-06-23T22:37:49.672Z","mood":"EXCITED"}','47b91633c433bf55e5e00aa061a0403bbdcc69c5b1f2db526c95b13109a1d3b4',2,'2025-06-23 22:33:32','2025-06-24 02:39:44',NULL);
INSERT INTO sync_data VALUES('sync_kZGzvRltGrEsNysXWVsop','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750718236476_1nuujglbk','{"timestamp":"2025-06-23T22:37:16.475Z","duration":30,"type":"REHEARSAL","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750718236476_1nuujglbk","createdAt":"2025-06-23T22:37:16.476Z","updatedAt":"2025-06-23T22:37:16.476Z"}','36c0407a83d6b309347545a89cbf24dc7a77e616f9c60e79b24ea4d25466fe73',1,'2025-06-23 22:37:17','2025-06-24 02:39:44',NULL);
INSERT INTO sync_data VALUES('196ef2f21064a79b28b8fa6ea8662b95','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','8UuSSTy6CdQhHE5ZyBW8t','{"id":"8UuSSTy6CdQhHE5ZyBW8t","timestamp":"2025-06-10 14:00:00","duration":55,"type":"LESSON","instrument":"GUITAR","pieces":[],"techniques":["Articulation"],"goalIds":[],"notes":"learn to focus. on minor improvements and on rundown concentration.","tags":[],"metadata":{"source":"manual"},"createdAt":1750007703107,"updatedAt":1750007703107}','3855755353547936',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('7d37fb16e7a99a721e05a6699fbc5748','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749603874243_wvu6tbee8','{"id":"entry_1749603874243_wvu6tbee8","timestamp":"2025-06-12 01:04:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750288584631,"updatedAt":1750288584631}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('95f92c8055049002ffea6d4381ec784f','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749663505678_xyp1kr9pb','{"id":"entry_1749663505678_xyp1kr9pb","timestamp":"2025-06-11 17:38:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["warmup"],"metadata":{"source":"manual"},"createdAt":1750288584680,"updatedAt":1750288584680}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('4e99bf1036931818702d174b2e0c52d6','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749603899309_41q3ukj48','{"id":"entry_1749603899309_41q3ukj48","timestamp":"2025-06-11 13:04:00","duration":30,"type":"LESSON","instrument":"GUITAR","pieces":[{"id":"custom-1749603896376","title":"Sor Op60 #22"}],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750288584737,"updatedAt":1750288584737}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('4e0255c0cfbf7e30ff1983849a398d59','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749599202963_ygfpzqgnb','{"id":"entry_1749599202963_ygfpzqgnb","timestamp":"2025-06-10 23:46:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"i hope","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750288584784,"updatedAt":1750288584784}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('a552e90c454a9a9e218e47dd90b1ec05','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749599119978_4jfpb2fnl','{"id":"entry_1749599119978_4jfpb2fnl","timestamp":"2025-06-10 14:00:00","duration":60,"type":"LESSON","instrument":"GUITAR","pieces":[{"id":"custom-1749599054379","title":"Sor Op60 #22"}],"techniques":["Articulation"],"goalIds":[],"notes":"correct mistakes during warm up. 15 minutes max. \nkeep concentration during run through. \nuse long sight reading to keep focus.","tags":[],"metadata":{"source":"manual"},"createdAt":1750288584834,"updatedAt":1750288584834}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('2cafd11edc36902a1838b213d9a2b933','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749747241072_ojx37xa10','{"id":"entry_1749747241072_ojx37xa10","timestamp":"2025-06-12 16:53:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"Logged in test.","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750467693431,"updatedAt":1750467693431}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('2e584e532e3bab174c3d85de28cdcb50','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749743961641_rcce87dso','{"id":"entry_1749743961641_rcce87dso","timestamp":"2025-06-12 15:59:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":["Sight-reading"],"goalIds":[],"notes":"all sor''s piece","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750467693469,"updatedAt":1750467693469}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('f5f043d66fc35486b3a426271d95f51f','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749743866656_77orvx0dj','{"id":"entry_1749743866656_77orvx0dj","timestamp":"2025-06-12 15:57:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1749743865123","title":"basic","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750467693510,"updatedAt":1750467693510}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('c0fd1c4c4470af7c01b5edcd171c0a0a','user_Oz_JA2ExxtY3WXJ83rxlC','logbook_entry','IUmr0mHTnVCTvYt-bAv9J','{"id":"IUmr0mHTnVCTvYt-bAv9J","timestamp":"2025-06-22 02:30:00","duration":120,"type":"PRACTICE","instrument":"PIANO","pieces":[{"id":"custom-1750481012771","title":"Haydn Hob.8"},{"id":"custom-1750481030662","title":"Bach BWV 778"}],"techniques":["Scales"],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750481039460,"updatedAt":1750481039460}','49556D72306D4854',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('34475700003487d97b09bbab6b7f62e1','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749568650225_yvzh78759','{"id":"entry_1749568650225_yvzh78759","timestamp":"2025-06-10 15:15:00","duration":60,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":["Phrasing"],"goalIds":[],"notes":"slow fixing mistakes\nconcentration in run through ","tags":[],"metadata":{"source":"manual"},"createdAt":1750531386199,"updatedAt":1750531386199}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('9703865c823719e3e563391edf2842d6','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','gy_3UQxXwO-EQugS8n_su','{"id":"gy_3UQxXwO-EQugS8n_su","timestamp":"2025-06-21 18:43:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"from mobile","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750531417239,"updatedAt":1750531417239}','67795F3355517858',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('05fde7defbbfa5b12ef66a65144f8a81','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','QFDInV-g6M9LZis7L5QI_','{"id":"QFDInV-g6M9LZis7L5QI_","timestamp":"2025-06-21 18:32:00","duration":10,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"just basic stuffs","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750531445475,"updatedAt":1750531445475}','514644496E562D67',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('22737999c62a4b255d7d1da7a78dab4a','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749794091954_idaiys2bb','{"id":"entry_1749794091954_idaiys2bb","timestamp":"2025-06-13 05:54:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750531447475,"updatedAt":1750531447475}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('b092ec2633888334ba0f8d88b12c4245','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749696444961_5iccgdk2r','{"id":"entry_1749696444961_5iccgdk2r","timestamp":"2025-06-13 02:47:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":["Phrasing"],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750531447557,"updatedAt":1750531447557}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('8956f6d2563633583776fcdefeafdc65','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749771175098_dy4sm9h5c','{"id":"entry_1749771175098_dy4sm9h5c","timestamp":"2025-06-12 23:32:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":["Interpretation"],"goalIds":[],"notes":"test again","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750531447603,"updatedAt":1750531447603}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('2c5ec2536fb7e7f652e3b59e4faeb002','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','urLMPa9XeSDukJHPzC1eA','{"id":"urLMPa9XeSDukJHPzC1eA","timestamp":"2025-06-22 17:04:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"basic","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750611869894,"updatedAt":1750611869894}','75724C4D50613958',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('a5b944f02504090c079c6969480480c9','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','oAxHT4TAZAaLa2ezfDeO_','{"id":"oAxHT4TAZAaLa2ezfDeO_","timestamp":"2025-06-22 17:06:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1750611994404","title":"Sor Op60 #22"}],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750611997429,"updatedAt":1750611997429}','6F41784854345441',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('2c29c78d1db94186ff95706ee6e33515','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750718398262_d9hgz3xwx','{"id":"entry_1750718398262_d9hgz3xwx","timestamp":"2025-06-23 22:39:00","duration":30,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718462692,"updatedAt":1750718462692}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('62f684b0e0140d979bff1da09b8365ba','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750718391461_wfcijvkx7','{"id":"entry_1750718391461_wfcijvkx7","timestamp":"2025-06-23 22:39:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718462746,"updatedAt":1750718462746}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('881f82d6584a31f7810256bcfd611722','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750695794976_nule9zoks','{"id":"entry_1750695794976_nule9zoks","timestamp":"2025-06-23 16:23:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":["Memorization"],"goalIds":[],"notes":"unlogged in local browser. old frontend","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718462806,"updatedAt":1750718462806}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('3e6b6589c4932ec6175d50c82cb3b0fc','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750611951515_s26sw6y4e','{"id":"entry_1750611951515_s26sw6y4e","timestamp":"2025-06-22 17:05:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1750611947879","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718462860,"updatedAt":1750718462860}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('9d64d68e0bd358017a3ff93a8319abf8','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','hrhoNZ9B82pjayIwzxJlZ','{"id":"hrhoNZ9B82pjayIwzxJlZ","timestamp":"2025-06-22 01:01:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"basic","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718462911,"updatedAt":1750718462911}','6872686F4E5A3942',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('3407f26e6eaa28f0bcfe1bf1bfe5a532','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','0K1GUslcGOqhnpy1uYbDW','{"id":"0K1GUslcGOqhnpy1uYbDW","timestamp":"2025-06-18 23:15:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"trying a new way","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718462967,"updatedAt":1750718462967}','304B314755736C63',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('88923308077bf3b2e7cb57088ecc8a4a','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','_r9G1lwcFphILrfZB7BV0','{"id":"_r9G1lwcFphILrfZB7BV0","timestamp":"2025-06-16 21:39:00","duration":30,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718463017,"updatedAt":1750718463017}','5F723947316C7763',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('58cbd91e0a99be3087e1f6647d8cc8af','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750109944317_7zzb3lzgm','{"id":"entry_1750109944317_7zzb3lzgm","timestamp":"2025-06-16 21:38:00","duration":30,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718463073,"updatedAt":1750718463073}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('68addfc00aa8a9f664c974325d3747f6','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','KPVNO2b1vPuQ-VEGmOfZ0','{"id":"KPVNO2b1vPuQ-VEGmOfZ0","timestamp":"2025-06-16 14:42:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463145,"updatedAt":1750718463145}','4B50564E4F326231',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('261e4530d8301eb84d87a5a758fe0a6d','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749950671285_g2tf7oyyu','{"id":"entry_1749950671285_g2tf7oyyu","timestamp":"2025-06-16 01:24:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718463201,"updatedAt":1750718463201}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('f5c9abf75feab5c3f6e481343bc2ccb1','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','D0k5m1dUy3O3zAGixnRU_','{"id":"D0k5m1dUy3O3zAGixnRU_","timestamp":"2025-06-15 17:26:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"run down free speed.","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463264,"updatedAt":1750718463264}','44306B356D316455',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('f7742d2b4f0bce7388fe40d34ae7303c','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','zknNycVm3Js3SpVxz9zuw','{"id":"zknNycVm3Js3SpVxz9zuw","timestamp":"2025-06-15 16:30:00","duration":45,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1750004143508","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"quater note 80-90\nslow, fluency, concentration.","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463329,"updatedAt":1750718463329}','7A6B6E4E7963566D',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('af9ef392b5356dce7e9e79e8e4cefbc8','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','xhm-EO-Xr3Qv4ndfN8ALE','{"id":"xhm-EO-Xr3Qv4ndfN8ALE","timestamp":"2025-06-15 16:00:00","duration":10,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"slurs","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718463384,"updatedAt":1750718463384}','78686D2D454F2D58',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('f78325aa351b77bbf92c6f412d44894f','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','DMx9VeulVyUBYQ2Z8gA_s','{"id":"DMx9VeulVyUBYQ2Z8gA_s","timestamp":"2025-06-15 15:22:00","duration":20,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1750004087644","title":"Sor Op60 #22","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463435,"updatedAt":1750718463435}','444D78395665756C',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('4699b5824923537058da6c178528de78','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','mVcM-NipM0oiDdyAv3xMf','{"id":"mVcM-NipM0oiDdyAv3xMf","timestamp":"2025-06-15 15:10:00","duration":40,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"single points. \nsight reading\nrun through from 80 step up.","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463485,"updatedAt":1750718463485}','6D56634D2D4E6970',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('39a259149216a4fbf99e34e40f8856a2','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','3y68YzES7L9rkgzIMEUJE','{"id":"3y68YzES7L9rkgzIMEUJE","timestamp":"2025-06-15 14:30:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"basics, warm-up\nloud notes.","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718463534,"updatedAt":1750718463534}','33793638597A4553',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('0c69d174915c6c8b1dfa35bdf5115ba3','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749875982461_4o32xt5k1','{"id":"entry_1749875982461_4o32xt5k1","timestamp":"2025-06-15 04:39:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718463586,"updatedAt":1750718463586}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('ea284999af2232fb765e1ac410331035','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749875617842_fy746h3ae','{"id":"entry_1749875617842_fy746h3ae","timestamp":"2025-06-15 04:33:00","duration":30,"type":"REHEARSAL","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718463636,"updatedAt":1750718463636}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('a90cc9ac7e50631322405df93b0bcde8','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','AayaHPzSgVEBxUhZuhlsy','{"id":"AayaHPzSgVEBxUhZuhlsy","timestamp":"2025-06-15 04:32:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"the day starts from here. and finish from here","tags":["sight-reading"],"metadata":{"source":"manual"},"createdAt":1750718463692,"updatedAt":1750718463692}','4161796148507A53',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('d92d195c5400e8f4ae2d06bc582b0fe0','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','BP8Xyg6pmNBXjNOT2DRL4','{"id":"BP8Xyg6pmNBXjNOT2DRL4","timestamp":"2025-06-15 03:15:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"slurs x3","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718463742,"updatedAt":1750718463742}','4250385879673670',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('fd50ca9c8f2a629eda8d07c91504a57e','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','A13OYzkNCrch3cAgqcr_1','{"id":"A13OYzkNCrch3cAgqcr_1","timestamp":"2025-06-14 22:24:00","duration":30,"type":"LESSON","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718463795,"updatedAt":1750718463795}','4131334F597A6B4E',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('50e0574373affa8cdddd58bcdab1ec03','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749939808273_2n6mlqchf','{"id":"entry_1749939808273_2n6mlqchf","timestamp":"2025-06-14 22:23:00","duration":30,"type":"REHEARSAL","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718463845,"updatedAt":1750718463845}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('5d88512a4fb9f31fdf861e5a8cf1ceb3','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','JP5Mz59pMHjDUUWAL-K6m','{"id":"JP5Mz59pMHjDUUWAL-K6m","timestamp":"2025-06-14 06:43:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463897,"updatedAt":1750718463897}','4A50354D7A353970',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('a1e4da2ef1cd1e32f805baaa13f4c0be','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749883443854_9rh3eydah','{"id":"entry_1749883443854_9rh3eydah","timestamp":"2025-06-14 06:43:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718463946,"updatedAt":1750718463946}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('68ab503f86300c3c5d7790c1e72cc268','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749879517430_il31l1q4q','{"id":"entry_1749879517430_il31l1q4q","timestamp":"2025-06-14 05:38:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464044,"updatedAt":1750718464044}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('98ff2b35c812de2614c8fba6c9dc9229','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','RfGUlWh6Y2K_O7TLZLt-5','{"id":"RfGUlWh6Y2K_O7TLZLt-5","timestamp":"2025-06-14 05:29:00","duration":30,"type":"LESSON","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718464095,"updatedAt":1750718464095}','526647556C576836',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('53bb8dde9f48c6ef3862c8e6897e4e20','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749878933708_c0828k751','{"id":"entry_1749878933708_c0828k751","timestamp":"2025-06-14 05:28:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464142,"updatedAt":1750718464142}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('954e6e3ab7fa7d9e5525900214c80c98','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749790455098_3jeifc07p','{"id":"entry_1749790455098_3jeifc07p","timestamp":"2025-06-14 04:54:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464189,"updatedAt":1750718464189}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('1e06f7901aa757ff54d62d6ecad5288b','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749780523213_0g4i7ot9s','{"id":"entry_1749780523213_0g4i7ot9s","timestamp":"2025-06-14 02:08:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464249,"updatedAt":1750718464249}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('c761833cae22b086cc613da4c3c220d7','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749780423346_gqosu6ybl','{"id":"entry_1749780423346_gqosu6ybl","timestamp":"2025-06-14 02:06:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464303,"updatedAt":1750718464303}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('f43d4b0f4a7ce4df398d135e5381c205','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749780285929_nn7vvvz31','{"id":"entry_1749780285929_nn7vvvz31","timestamp":"2025-06-14 02:04:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[{"id":"custom-1749780282830","title":"Chopin","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464353,"updatedAt":1750718464353}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('8bbce441968014143567b7069b41ef53','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','ETS9KFye4dyD5l-5YTY0R','{"id":"ETS9KFye4dyD5l-5YTY0R","timestamp":"2025-06-13 16:15:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"why","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464401,"updatedAt":1750718464401}','455453394B467965',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('36691cec4268c3f787c6da12e11cbe29','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','-7CGN8hA9ftLBdpivs-jB','{"id":"-7CGN8hA9ftLBdpivs-jB","timestamp":"2025-06-13 16:15:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464450,"updatedAt":1750718464450}','2D3743474E386841',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('1f3c0f1ce69d070a416625809400bc3c','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749829328560_hyj8nqaiv','{"id":"entry_1749829328560_hyj8nqaiv","timestamp":"2025-06-13 15:42:00","duration":30,"type":"REHEARSAL","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718464497,"updatedAt":1750718464497}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('adf8a200bd527cc7531457f3890c8832','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749828322657_n17mdyw95','{"id":"entry_1749828322657_n17mdyw95","timestamp":"2025-06-13 15:25:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[{"id":"custom-1749828320276","title":"New","composer":null,"measures":null,"tempo":null}],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464544,"updatedAt":1750718464544}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('1f3219dc080b58189b2253576b2e861c','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749828135894_qiefuyak0','{"id":"entry_1749828135894_qiefuyak0","timestamp":"2025-06-13 15:22:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["sight-reading"],"metadata":{"source":"manual"},"createdAt":1750718464597,"updatedAt":1750718464597}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('ddf4b5b32fffe90ee8cbf2732995659b','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749828091379_ib3zvwmvf','{"id":"entry_1749828091379_ib3zvwmvf","timestamp":"2025-06-13 15:21:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464647,"updatedAt":1750718464647}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('672560f34e72db0c26bdc31d8be28b0e','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749827904882_jb9qesvc6','{"id":"entry_1749827904882_jb9qesvc6","timestamp":"2025-06-13 15:18:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[{"id":"custom-1749827901279","title":"Sor","composer":null,"measures":null,"tempo":null}],"techniques":["Interpretation"],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718464695,"updatedAt":1750718464695}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('70007e96eb9237aea2987b81c4c0a963','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','RpdoOfJOcOSHy2oGvIzz9','{"id":"RpdoOfJOcOSHy2oGvIzz9","timestamp":"2025-06-13 15:17:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464744,"updatedAt":1750718464744}','5270646F4F664A4F',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('d427e8d9e79376ca410fb3a9c3d92032','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','1_8HGX3yqd2mrn3upAsX0','{"id":"1_8HGX3yqd2mrn3upAsX0","timestamp":"2025-06-13 15:17:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["technical"],"metadata":{"source":"manual"},"createdAt":1750718464790,"updatedAt":1750718464790}','315F384847583379',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('be45098af8021aaa323c6891d38c6f3e','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749798846003_c4xc7skh1','{"id":"entry_1749798846003_c4xc7skh1","timestamp":"2025-06-13 07:14:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464836,"updatedAt":1750718464836}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('8984bfcad6d1dbfd57f05254d52a2858','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749798887484_gsr3q31sb','{"id":"entry_1749798887484_gsr3q31sb","timestamp":"2025-06-13 07:14:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464885,"updatedAt":1750718464885}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('2226d5e47c628925585c3b88c7323091','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749798808985_ygcyblqnc','{"id":"entry_1749798808985_ygcyblqnc","timestamp":"2025-06-13 07:13:00","duration":30,"type":"PRACTICE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464934,"updatedAt":1750718464934}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('9e40deb0371d98fcb35dc343c7fe18e7','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749798801322_a8mvsr32k','{"id":"entry_1749798801322_a8mvsr32k","timestamp":"2025-06-13 07:13:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718464984,"updatedAt":1750718464984}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('63bdf18f634cb0a69b1693efe1ebf959','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749797184101_o5jhu3z6j','{"id":"entry_1749797184101_o5jhu3z6j","timestamp":"2025-06-13 06:46:00","duration":30,"type":"PERFORMANCE","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718465035,"updatedAt":1750718465035}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('565e33859ce4488de4ee20209d928e67','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749797154655_lgu1p5iip','{"id":"entry_1749797154655_lgu1p5iip","timestamp":"2025-06-13 06:45:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718465082,"updatedAt":"2025-06-24T03:42:14.960Z","deletedAt":"2025-06-24T03:42:14.960Z"}','1f838ebcdff5d1964f0a8f4e5b93a5e7a4986b1b326684d0a26089c8839da25b',2,'2025-06-24 02:30:26','2025-06-24 03:42:15','2025-06-24T03:42:14.960Z');
INSERT INTO sync_data VALUES('8549e2f07d3ae817306f92f5e013ed65','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749796380012_kzxbctnqj','{"id":"entry_1749796380012_kzxbctnqj","timestamp":"2025-06-13 06:32:00","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":["repertoire"],"metadata":{"source":"manual"},"createdAt":1750718465128,"updatedAt":"2025-06-24T03:16:56.179Z","deletedAt":"2025-06-24T03:16:55.925Z"}','e74b0c2c5e1c3cce2d3f90c4df9ac6e09d8b1f2c9101288bc1a06dfbe029ede2',2,'2025-06-24 02:30:26','2025-06-24 03:16:56',NULL);
INSERT INTO sync_data VALUES('9040ed835ba87e64af3ae5134958000c','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749794746192_6yfqin2yh','{"id":"entry_1749794746192_6yfqin2yh","timestamp":"2025-06-13 06:05:00","duration":30,"type":"REHEARSAL","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718465175,"updatedAt":"2025-06-24T03:16:30.664Z","deletedAt":"2025-06-24T03:16:30.258Z"}','fd4e246d9edaa77ea308378989940f366325d8d83a7a84dc0d10df202ca87c69',2,'2025-06-24 02:30:26','2025-06-24 03:16:30',NULL);
INSERT INTO sync_data VALUES('f6605d279d52941925b07e74ad77828a','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749794128318_6spaoxrej','{"id":"entry_1749794128318_6spaoxrej","timestamp":"2025-06-13 05:55:00","duration":30,"type":"REHEARSAL","instrument":"GUITAR","pieces":[],"techniques":["Dynamics"],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718465224,"updatedAt":1750718465224}','656E7472795F3137',1,'2025-06-24 02:30:26','2025-06-24 03:05:45',NULL);
INSERT INTO sync_data VALUES('0efd674f58a92d005b503d04087eca74','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1749794100555_grfmf5b0j','{"id":"entry_1749794100555_grfmf5b0j","timestamp":"2025-06-24T03:20:34.696Z","duration":30,"type":"PERFORMANCE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"createdAt":1750718465280,"updatedAt":"2025-06-24T03:41:25.422Z","deletedAt":"2025-06-24T03:41:25.422Z"}','780131ae8db7da841673fe306ab8e89047d796de7274ed724648b49774ea720b',8,'2025-06-24 02:30:26','2025-06-24 03:41:25','2025-06-24T03:41:25.422Z');
INSERT INTO sync_data VALUES('sync_hw4Q3z78l9_3cy2lXbGlv','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750733866341_ehclb4pqy','{"timestamp":"2025-06-24T02:57:46.340Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"new frontend","mood":"NEUTRAL","tags":[],"metadata":{"source":"manual"},"id":"entry_1750733866341_ehclb4pqy","createdAt":"2025-06-24T02:57:46.341Z","updatedAt":"2025-06-24T02:57:46.341Z"}','3480ac5371474447a4df0c9607a2e07d7352446e2875598eb575eb92121f9695',1,'2025-06-24 02:57:47','2025-06-24 02:57:47',NULL);
INSERT INTO sync_data VALUES('sync__Lmtovclp_1zzb0mDXXdU','user_ANwtZd1XrmABU7W1bW5yf','logbook_entry','entry_1750738085045_qp7otr12n','{"timestamp":"2025-06-24T04:08:05.044Z","duration":60,"type":"PRACTICE","instrument":"PIANO","pieces":[{"title":"Sonata in G Major, Hob. XVI:8","composer":"Haydn"},{"title":"BWV 788 Invention No.7","composer":"Bach"}],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750738085045_qp7otr12n","createdAt":"2025-06-24T04:08:05.045Z","updatedAt":"2025-06-24T04:08:05.045Z"}','91a3470605df64155591acd1bea502da7649964525eab0bac45769a173bc79f6',1,'2025-06-24 04:08:05','2025-06-24 04:08:05',NULL);
INSERT INTO sync_data VALUES('sync_lxKOtA9PquJHmI_PsMF79','user_ANwtZd1XrmABU7W1bW5yf','logbook_entry','entry_1750738125813_wk17g51jb','{"timestamp":"2025-06-24T04:08:45.813Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[{"title":"BWV 788 Invention No.7","composer":"Bach"}],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750738125813_wk17g51jb","createdAt":"2025-06-24T04:08:45.813Z","updatedAt":"2025-06-24T04:08:55.225Z","deletedAt":"2025-06-24T04:08:55.225Z"}','b54b30b26119c8e086a5ad4dc3daa52e061ba5af4a56c8c61ef2e53bb5038806',2,'2025-06-24 04:08:46','2025-06-24 04:08:55','2025-06-24T04:08:55.225Z');
INSERT INTO sync_data VALUES('sync_PPFJHk-FUmeDVe9hWTK0f','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750823306261_mcaby3l9m','{"timestamp":"2025-06-25T03:48:26.260Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","mood":"NEUTRAL","tags":[],"metadata":{"source":"manual"},"id":"entry_1750823306261_mcaby3l9m","createdAt":"2025-06-25T03:48:26.261Z","updatedAt":"2025-06-25T03:49:52.124Z","deletedAt":"2025-06-25T03:49:52.123Z"}','9916bab09252acb75bbcc9d545ff67b720774e589df9c427829a0e7ba5c63e1a',2,'2025-06-25 03:48:27','2025-06-25 03:49:52','2025-06-25T03:49:52.123Z');
INSERT INTO sync_data VALUES('sync_4GEevyP1HMPn3istFkYDu','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750823337378_dl61jfss2','{"timestamp":"2025-06-25T03:48:57.377Z","duration":30,"type":"LESSON","instrument":"GUITAR","pieces":[],"techniques":[],"goalIds":[],"notes":"","mood":"SATISFIED","tags":[],"metadata":{"source":"manual"},"id":"entry_1750823337378_dl61jfss2","createdAt":"2025-06-25T03:48:57.378Z","updatedAt":"2025-06-25T03:48:57.378Z"}','2b1d3f264473a3ab6f3d1dbb566440cb4d1add3676ef538d94ed7bfcbe38e869',1,'2025-06-25 03:48:58','2025-06-25 03:48:58',NULL);
INSERT INTO sync_data VALUES('sync_7KvsFxqvdFutaY1Faf_6y','user_Z_djK1xo_IicL70UqanqJ','logbook_entry','entry_1750823454182_m3ji0du1n','{"timestamp":"2025-06-25T03:50:54.181Z","duration":30,"type":"PRACTICE","instrument":"PIANO","pieces":[],"techniques":[],"goalIds":[],"notes":"","tags":[],"metadata":{"source":"manual"},"id":"entry_1750823454182_m3ji0du1n","createdAt":"2025-06-25T03:50:54.182Z","updatedAt":"2025-06-25T03:50:54.182Z"}','1407428b71f255344abda4efe0b61d3349cd87d7d231b946bd8c530a950ea5bc',1,'2025-06-25 03:50:54','2025-06-25 03:50:54',NULL);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('d1_migrations',10);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sheet_music_instrument ON sheet_music(instrument);
CREATE INDEX idx_sheet_music_difficulty ON sheet_music(difficulty);
CREATE INDEX idx_sheet_music_instrument_difficulty ON sheet_music(instrument, difficulty);
CREATE INDEX idx_sheet_music_style_period ON sheet_music(style_period);
CREATE INDEX idx_sessions_user ON practice_sessions(user_id);
CREATE INDEX idx_sessions_user_instrument ON practice_sessions(user_id, instrument);
CREATE INDEX idx_sessions_started_at ON practice_sessions(started_at);
CREATE INDEX idx_sessions_user_started ON practice_sessions(user_id, started_at);
CREATE INDEX idx_logs_session ON practice_logs(session_id);
CREATE INDEX idx_logs_created_at ON practice_logs(created_at);
CREATE INDEX idx_logbook_entries_user_id ON logbook_entries(user_id);
CREATE INDEX idx_logbook_entries_timestamp ON logbook_entries(timestamp);
CREATE INDEX idx_logbook_entries_type ON logbook_entries(type);
CREATE INDEX idx_logbook_entries_instrument ON logbook_entries(instrument);
CREATE INDEX idx_logbook_entries_mood ON logbook_entries(mood);
CREATE INDEX idx_logbook_entries_session_id ON logbook_entries(session_id);
CREATE INDEX idx_logbook_entries_created_at ON logbook_entries(created_at);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);
CREATE INDEX idx_goals_target_date ON goals(target_date);
CREATE INDEX idx_goals_created_at ON goals(created_at);
CREATE INDEX idx_sync_metadata_user_id ON sync_metadata(user_id);
CREATE INDEX idx_deleted_entities_user_id ON deleted_entities(user_id);
CREATE INDEX idx_deleted_entities_deleted_at ON deleted_entities(deleted_at);
CREATE INDEX idx_practice_sessions_updated_at ON practice_sessions(updated_at);
CREATE INDEX idx_goals_updated_at ON goals(updated_at);
CREATE INDEX idx_logbook_entries_updated_at ON logbook_entries(updated_at);
CREATE INDEX idx_practice_sessions_device ON practice_sessions(device_id);
CREATE INDEX idx_logbook_entries_device ON logbook_entries(device_id);
CREATE INDEX idx_goals_device ON goals(device_id);
CREATE INDEX idx_device_info_user ON device_info(user_id);
CREATE INDEX idx_sync_logs_user ON sync_logs(user_id);
CREATE INDEX idx_sync_logs_timestamp ON sync_logs(timestamp);
CREATE UNIQUE INDEX idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX idx_sync_data_user ON sync_data(user_id);
CREATE INDEX idx_sync_data_type ON sync_data(entity_type);
CREATE INDEX idx_sync_data_updated ON sync_data(updated_at);
CREATE TRIGGER update_users_updated_at
AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
CREATE TRIGGER update_sync_data_updated_at
AFTER UPDATE ON sync_data
BEGIN
  UPDATE sync_data SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
