-- Custodian: "Org Roster" migration (fs.txt org chart + team-bios.txt)
-- Generated from a full read of the Kelly Benefits org-chart PDF export (fs.txt) and
-- the public Senior Leadership Team / Our Team roster (team-bios.txt). See
-- roster-full.tsv (same directory) for the complete person-by-person source, including
-- notes on every judgment call and flagged ambiguity referenced below.
--
-- SUMMARY
--   existing org_people rows updated (title_id/manager_id, +root parent for bryanKelly,
--     +manager_id for trish): 19
--   existing org_people row deleted (confirmed dummy/gone): 1 (justin)
--   new org_people rows inserted: 445
--   manager_id resolved (known): 442
--   manager_id left null (not observed as anyone's child in source, or column-bleed
--     made attribution unreliable -- see roster-full.tsv source_note for each): 22
--
-- Reviewed and merged during verification (not left as a flagged duplicate):
--   * The agent's draft had a new "maryBackerMiceli" (VP of Human Resources, reporting to
--     Craig Horner, 4 direct reports) as a separate row from the existing "trish" (Trish
--     Backer-Miceli, VP Human Resources). Same unusual double surname + the exact same
--     specific title at one company is decisive enough to treat as the same real person
--     (unlike the Pfeifer case below, where the first names differ and could plausibly be
--     two different people) -- merged: trish keeps her existing id/name/title, gains
--     manager_id='craig' and her real HR team (kellyMcHoul/pamelaDelVecchio/sarahGoodfriend/
--     theressiaShoup) as reports, sourced from the chart. Worth a quick real-life confirmation
--     but treated as resolved rather than left duplicated in the data.
--
-- Still flagged for human confirmation (not auto-resolved, see roster-full.tsv for detail):
--   * robertPfeifer (new, Growth Leader KBP) vs existing brianP (Growth Leader, KB Payroll)
--     -- may be the same real person under two different first names; left separate since,
--     unlike the Backer-Miceli case, the first names genuinely differ.
--   * johnKellyRA (new, VP of Retirement Advisory Services) vs existing johnKellyJr
--     (bios title "SVP, Growth") -- kept separate per the collision rule; titles do not
--     obviously match, user should confirm which is correct.
--   * adamP / frankieIV / stephenK / sandra manager_id set to wesleyMace (wes) -- this
--     deviates from the task brief's working assumption that these had no confirmed
--     parent; found via an exact count-matched reading of a 48-name flattened row
--     (1+10+6+1+14+6+10 = 48) under John Kelly's org. Flagged for verification.

alter table org_people add column if not exists manager_id text references org_people(id);

insert into org_titles (id, label, rank) values
  ('chairman', 'Chairman', 1),
  ('chief', 'Chief/C-Suite', 2),
  ('evp', 'EVP', 3),
  ('svp', 'SVP', 4),
  ('vp', 'VP', 5),
  ('director', 'Director', 6),
  ('manager', 'Manager/Team Leader', 7),
  ('ic', 'Individual Contributor', 8);

delete from org_people where id = 'justin';

-- ============ PASS 1: existing people -- title_id / manager_id (+ parent for bryanKelly only) ============
update org_people set title_id = 'chairman' where id = 'fx3';
update org_people set title_id = 'chief', parent = 'root' where id = 'bryanKelly';
update org_people set title_id = 'chief' where id = 'davidKellySr';
update org_people set title_id = 'chief' where id = 'frankIII';
update org_people set title_id = 'chief' where id = 'johnKelly';
update org_people set title_id = 'chief' where id = 'craig';
update org_people set title_id = 'svp' where id = 'jen';
update org_people set title_id = 'vp' where id = 'davidKellyJr';
update org_people set title_id = 'svp' where id = 'josh';
update org_people set title_id = 'chief' where id = 'katherine';
update org_people set title_id = 'chief' where id = 'rasoul';
update org_people set title_id = 'chief' where id = 'wes';
update org_people set title_id = 'evp' where id = 'adamP';
update org_people set title_id = 'evp' where id = 'frankieIV';
update org_people set title_id = 'vp' where id = 'sandra';
update org_people set title_id = 'evp' where id = 'stephenK';
update org_people set title_id = 'svp' where id = 'johnKellyJr';
update org_people set title_id = 'vp' where id = 'trish';
update org_people set title_id = 'evp' where id = 'brianP';

-- ============ PASS 2: new people -- insert (manager_id intentionally omitted this pass) ============
insert into org_people (id, name, title, parent, sort_order, title_id) values
  ('staceyZour', 'Stacey Zour', 'Executive Assistant I (PT)', 'root', 7, 'ic'),
  ('garrettKalb', 'Garrett Kalb', 'Office Support', 'root', 8, 'ic'),
  ('kevinHuntley', 'Kevin Huntley', 'Director of Sales and Marketing', 'payroll', 9, 'director'),
  ('andrewRoberts', 'Andrew Roberts', 'Account Executive II - KBP', 'payroll', 10, 'ic'),
  ('annieMartin', 'Annie Martin', 'Account Executive II - KBP', 'payroll', 11, 'ic'),
  ('avaFerrara', 'Ava Ferrara', 'Account Executive II - KBP', 'payroll', 12, 'ic'),
  ('colinHeacock', 'Colin Heacock', 'Account Executive I - KBP', 'payroll', 13, 'ic'),
  ('dianaRawlings', 'Diana Rawlings', 'Sales Enablement Lead', 'payroll', 14, 'manager'),
  ('jamesBrownPayroll', 'James Brown', 'Account Executive II - KBP', 'payroll', 15, 'ic'),
  ('michaelaKammer', 'Michaela Kammer', 'Account Executive II - KBP', 'payroll', 16, 'ic'),
  ('patrickReed', 'Patrick Reed', 'Account Executive II - KBP', 'payroll', 17, 'ic'),
  ('tracyBrubaker', 'Tracy Brubaker', 'Workers Compensation Specialist', 'payroll', 18, 'ic'),
  ('rachelMorton', 'Rachel Morton', 'Executive Assistant & Facilities Operations Manager', 'payroll', 19, 'ic'),
  ('robertPfeifer', 'Robert Pfeifer', 'Growth Leader KBP', 'payroll', 20, 'evp'),
  ('breannaLamb', 'Breanna Lamb', 'First Impressions Ambassador', 'payroll', 21, 'ic'),
  ('brendanCohen', 'Brendan Cohen', 'Facilities Services & Mail Team', 'payroll', 22, 'ic'),
  ('danteHines', 'Dante Hines', 'Facilities Services & Maintenance', 'payroll', 23, 'ic'),
  ('josephCunningham', 'Joseph Cunningham', 'VP of Compliance and Privacy', 'root', 25, 'vp'),
  ('jenniferButcher', 'Jennifer Butcher', 'Manager of Carrier Contracts...', 'root', 26, 'manager'),
  ('mariaDonatelli', 'Maria Donatelli', 'Licensing Contract Specialist', 'root', 27, 'ic'),
  ('michaelNwaosuagwu', 'Michael Nwaosuagwu', 'Director of Internal Controls', 'root', 28, 'director'),
  ('katherineMerrey', 'Katherine Merrey', 'Executive Assistant I and Project...', 'root', 29, 'ic'),
  ('abigailAugustitus', 'Abigail Augustitus', 'Departmental Assistant', 'root', 30, 'ic'),
  ('kimberlyOlson', 'Kimberly Olson', 'Manager of Federal and State...', 'root', 31, 'manager'),
  ('kellyMcHoul', 'Kelly McHoul', 'HR Benefits and Payroll Specialist', 'root', 33, 'ic'),
  ('pamelaDelVecchio', 'Pamela Del Vecchio', 'Human Resources Specialist', 'root', 34, 'ic'),
  ('sarahGoodfriend', 'Sarah Goodfriend', 'Director of Employee Engagement, Leadership Development and Wellness', 'root', 35, 'director'),
  ('theressiaShoup', 'Theressia Shoup', 'Human Resources Recruiter', 'root', 36, 'ic'),
  ('ryanAdams', 'Ryan Adams', 'Manager Business Reporting', 'root', 37, 'manager'),
  ('bethelihemGebeyehu', 'Bethelihem Gebeyehu', 'Financial Reporting Analyst', 'root', 38, 'ic'),
  ('trudyInnerst', 'Trudy Innerst', 'Director of Financial Operations', 'root', 39, 'director'),
  ('amandaVailati', 'Amanda Vailati', 'Financial Operations Specialist', 'root', 40, 'ic'),
  ('derekHirsch', 'Derek Hirsch', 'Manager of Financial Operations', 'root', 41, 'manager'),
  ('aaronCopenhaver', 'Aaron Copenhaver', 'Finance Administrator', 'root', 42, 'ic'),
  ('anthonyAbraham', 'Anthony Abraham', 'Credit & Collections Representative', 'root', 43, 'ic'),
  ('codyCorsello', 'Cody Corsello', 'Finance Administrator', 'root', 44, 'ic'),
  ('dorianBock', 'Dorian Bock', 'Senior Credit & Collections Representative', 'root', 45, 'ic'),
  ('ginaWallace', 'Gina Wallace', 'Finance Administrator', 'root', 46, 'ic'),
  ('diannaMcElwain', 'Dianna McElwain', 'Financial Operations Specialist', 'root', 47, 'ic'),
  ('jenniferRinaudo', 'Jennifer Rinaudo', 'Carrier Compensation Coordinator', 'root', 48, 'ic'),
  ('reionnaGross', 'Reionna Gross', 'Carrier Compensation & Financial...', 'root', 49, 'ic'),
  ('williamCopenhaver', 'William Copenhaver', 'Corporate Controller', 'root', 50, 'director'),
  ('brendaBachman', 'Brenda Bachman', 'Staff Accountant', 'root', 51, 'ic'),
  ('matthewSeifert', 'Matthew Seifert', 'Accounting Manager', 'root', 52, 'manager'),
  ('austinSynan', 'Austin Synan', 'Staff Accountant', 'root', 53, 'ic'),
  ('michaelGreen', 'Michael Green', 'Senior Accountant', 'root', 54, 'ic'),
  ('samanthaTrcka', 'Samantha Trcka', 'Accounting Manager', 'root', 55, 'manager'),
  ('amyGentner', 'Amy Gentner', 'Producer Services Analyst', 'root', 56, 'ic'),
  ('dorcasWaichigo', 'Dorcas Waichigo', 'Accounts Receivable Representative', 'root', 57, 'ic'),
  ('katelynneRodgers', 'Katelynne Rodgers', 'Producer Services Analyst', 'root', 58, 'ic'),
  ('sueBowmaster', 'Sue Bowmaster', 'Credit & Collections Cash...', 'root', 59, 'ic'),
  ('tylerYoung', 'Tyler Young', 'Accounts Receivable Representative', 'root', 60, 'ic'),
  ('shawnZollicoffer', 'Shawn Zollicoffer', 'Staff Accountant', 'root', 61, 'ic'),
  ('heatherBroadhead', 'Heather Broadhead', 'Administrative Coordinator & Project...', 'root', 63, 'ic'),
  ('jacquelineHeffner', 'Jacqueline Heffner', 'VP of Corporate Communications & Marketing', 'root', 64, 'vp'),
  ('amandaMerrey', 'Amanda Merrey', 'Director, Events & Community Engagement', 'root', 65, 'director'),
  ('brettShinsky', 'Brett Shinsky', 'Senior Graphic Designer', 'root', 66, 'ic'),
  ('jenniferJardell', 'Jennifer Jardell', 'Director of Content Marketing', 'root', 67, 'director'),
  ('jessicaPotter', 'Jessica Potter', 'Project Coordinator and Marketing...', 'root', 68, 'ic'),
  ('heatherKness', 'Heather Kness', 'Senior Graphic Designer II', 'root', 69, 'ic'),
  ('michaelLittle', 'Michael Little', 'Director of Multimedia', 'root', 70, 'director'),
  ('mackenzieTurpin', 'Mackenzie Turpin', 'Executive Assistant II & Project...', 'root', 71, 'ic'),
  ('ingridKirkman', 'Ingrid Kirkman', 'Executive Suite Project Assistant', 'root', 72, 'ic'),
  ('jasonDanner', 'Jason Danner', 'SVP, Market Leader', 'strategies', 73, 'svp'),
  ('jessicaBickley', 'Jessica Bickley', 'Executive Assistant I', 'strategies', 74, 'ic'),
  ('johnKellyRA', 'John Kelly', 'VP of Retirement Advisory Services', 'advisory', 75, 'vp'),
  ('alfredSanto', 'Alfred Santo', 'Vice President & Financial Advisor', 'advisory', 76, 'vp'),
  ('christopherCarroll', 'Christopher Carroll', 'Senior Account Executive', 'advisory', 77, 'ic'),
  ('christopherHolt', 'Christopher Holt', 'Director, Producer Development', 'advisory', 78, 'director'),
  ('drewLaundry', 'Drew Laundry', 'Account Executive I', 'advisory', 79, 'ic'),
  ('kyleSavick', 'Kyle Savick', 'Account Executive I', 'advisory', 80, 'ic'),
  ('williamMarshall', 'William Marshall', 'Account Executive I', 'advisory', 81, 'ic'),
  ('davidPitz', 'David Pitz', 'Client Services Manager I', 'advisory', 83, 'manager'),
  ('jamesCrowley', 'James Crowley', 'VP and Senior Consultant', 'advisory', 84, 'vp'),
  ('bernElCooper', 'Bern-El Cooper', 'Account Executive II', 'advisory', 85, 'ic'),
  ('brianHubbard', 'Brian Hubbard', 'VP and Senior Consultant', 'advisory', 86, 'vp'),
  ('carolynKingan', 'Carolyn Kingan', 'Director & Senior Account Manager', 'advisory', 87, 'director'),
  ('cherylHinchy', 'Cheryl Hinchy', 'Senior Consultant', 'advisory', 88, 'ic'),
  ('ericLeikach', 'Eric Leikach', 'Lead Consultant', 'advisory', 89, 'manager'),
  ('greggSimmons', 'Gregg Simmons', 'Consultant', 'advisory', 90, 'ic'),
  ('heatherHall', 'Heather Hall', 'Senior Consultant', 'advisory', 91, 'ic'),
  ('kellieHopkins', 'Kellie Hopkins', 'Account Executive I', 'advisory', 92, 'ic'),
  ('kimberleeBosley', 'Kimberlee Bosley', 'Senior Consultant', 'advisory', 93, 'ic'),
  ('lisaJolles', 'Lisa Jolles', 'Senior Consultant', 'advisory', 94, 'ic'),
  ('loisSheely', 'Lois Sheely', 'Consultant PT', 'advisory', 95, 'ic'),
  ('markBarney', 'Mark Barney', 'Consultant', 'advisory', 96, 'ic'),
  ('markHammett', 'Mark Hammett', 'VP and Senior Consultant', 'advisory', 97, 'vp'),
  ('natalieSiciliano', 'Natalie Siciliano', 'Lead Consultant', 'advisory', 98, 'manager'),
  ('jeffreyPedone', 'Jeffrey Pedone', 'Consultant', 'advisory', 99, 'ic'),
  ('jarrettJedlicka', 'Jarrett Jedlicka', 'SVP National Growth', 'advisory', 100, 'svp'),
  ('lukeCaplan', 'Luke Caplan', 'Financial Advisor, Retirement Plans', 'advisory', 101, 'ic'),
  ('markKauffman', 'Mark Kauffman', 'Account Executive II', 'advisory', 102, 'ic'),
  ('michaelKelly', 'Michael Kelly', 'VP of Business Development', 'advisory', 103, 'vp'),
  ('josephDiMaggio', 'Joseph DiMaggio', 'SVP of Consulting & Account Management', 'strategies', 104, 'svp'),
  ('benjaminDutcher', 'Benjamin Dutcher', 'Senior Consultant', 'strategies', 105, 'ic'),
  ('cheriWheeler', 'Cheri Wheeler', 'VP & Senior Consultant', 'strategies', 106, 'vp'),
  ('danielleOrtman', 'Danielle Ortman', 'Senior Consultant', 'strategies', 107, 'ic'),
  ('frederickDanner', 'Frederick Danner', 'Consultant', 'strategies', 108, 'ic'),
  ('johnNewcome', 'John Newcome', 'VP and Senior Consultant', 'strategies', 109, 'vp'),
  ('lawrenceDevitt', 'Lawrence Devitt', 'VP and Senior Consultant', 'strategies', 110, 'vp'),
  ('ashleyHumphries', 'Ashley Humphries', 'Executive Assistant II', 'strategies', 112, 'ic'),
  ('katharineLochte', 'Katharine Lochte', 'SVP of Operations', 'strategies', 113, 'svp'),
  ('amandaSaulsbury', 'Amanda Saulsbury', 'Senior Account Manager', 'strategies', 114, 'ic'),
  ('amyNovotny', 'Amy Novotny', 'VP of Analytics', 'strategies', 115, 'vp'),
  ('donnaWelsh', 'Donna Welsh', 'Data Analytics Project Manager', 'strategies', 116, 'manager'),
  ('andreaWinfrey', 'Andrea Winfrey', 'Manager of Account Management & Senior Account Manager', 'strategies', 117, 'manager'),
  ('allieDelain', 'Allie Delain', 'Account Manager III', 'strategies', 118, 'ic'),
  ('brookeLosin', 'Brooke Losin', 'Account Manager III', 'strategies', 119, 'ic'),
  ('danaCahill', 'Dana Cahill', 'Communications Specialist and Account Manager', 'strategies', 120, 'ic'),
  ('deirdreBoyer', 'Deirdre Boyer', 'Team Leader, Account Management', 'strategies', 121, 'manager'),
  ('elizabethGallagher', 'Elizabeth Gallagher', 'Account Manager II', 'strategies', 122, 'ic'),
  ('ginaOBrien', 'Gina O''Brien', 'Account Manager II', 'strategies', 123, 'ic'),
  ('gwendolynBruce', 'Gwendolyn Bruce', 'Account Manager II', 'strategies', 124, 'ic'),
  ('kimberlyPuritz', 'Kimberly Puritz', 'Account Manager I', 'strategies', 125, 'ic'),
  ('lindsayOlock', 'Lindsay Olock', 'Senior Account Manager II', 'strategies', 126, 'ic'),
  ('loriSheats', 'Lori Sheats', 'Senior Account Manager I', 'strategies', 127, 'ic'),
  ('margaretBowers', 'Margaret Bowers', 'Senior Account Manager I', 'strategies', 128, 'ic'),
  ('melbaPhipps', 'Melba Phipps', 'Account Manager II', 'strategies', 129, 'ic'),
  ('natalieThorndike', 'Natalie Thorndike', 'Account Manager II', 'strategies', 130, 'ic'),
  ('neilWelch', 'Neil Welch', 'Account Manager II', 'strategies', 131, 'ic'),
  ('patrickDevitt', 'Patrick Devitt', 'Account Manager II', 'strategies', 132, 'ic'),
  ('rebeccaTopper', 'Rebecca Topper', 'Senior Account Manager I', 'strategies', 133, 'ic'),
  ('samanthaAmato', 'Samantha Amato', 'Account Manager II', 'strategies', 134, 'ic'),
  ('tammyBertazon', 'Tammy Bertazon', 'Senior Account Manager II', 'strategies', 135, 'ic'),
  ('tommyStabile', 'Tommy Stabile', 'Senior Account Manager I', 'strategies', 136, 'ic'),
  ('catherineWaterhouse', 'Catherine Waterhouse', 'Senior Account Manager III', 'strategies', 137, 'ic'),
  ('cynthiaKelly', 'Cynthia Kelly', 'VP of Plan Management', 'strategies', 138, 'vp'),
  ('alisonBelt', 'Alison Belt', 'Director of Plan Management', 'strategies', 139, 'director'),
  ('johnPanasuk', 'John Panasuk', 'Reporting Analyst', 'strategies', 140, 'ic'),
  ('rickOldenburg', 'Rick Oldenburg', 'Team Leader & Senior Reporting Analyst', 'strategies', 141, 'manager'),
  ('meganUrbanski', 'Megan Urbanski', 'Senior Reporting Analyst', 'strategies', 142, 'ic'),
  ('davidEsmond', 'David Esmond', 'VP of Underwriting', 'strategies', 143, 'vp'),
  ('josephAngelini', 'Joseph Angelini', 'Senior Underwriter', 'strategies', 144, 'ic'),
  ('peterStevenson', 'Peter Stevenson', 'Underwriter', 'strategies', 145, 'ic'),
  ('nicoleChamberlin', 'Nicole Chamberlin', 'Underwriter II', 'strategies', 146, 'ic'),
  ('janiceLynch', 'Janice Lynch', 'Senior Account Manager', 'strategies', 147, 'ic'),
  ('jenniferBerman', 'Jennifer Berman', 'SVP of Compliance, Kelly Benefits Strategies / ERISA Counsel', 'strategies', 148, 'svp'),
  ('hayleyPutnam', 'Hayley Putnam', 'Benefits Compliance Manager', 'strategies', 149, 'manager'),
  ('barbaraBissett', 'Barbara Bissett', 'Compliance Specialist', 'strategies', 150, 'ic'),
  ('leslieHlavach', 'Leslie Hlavach', 'Form 5500 Manager', 'strategies', 151, 'manager'),
  ('lisaDiNenna', 'Lisa DiNenna', 'Administrative Assistant', 'strategies', 152, 'ic'),
  ('marihaBurkavage', 'Mariha Burkavage', 'Senior Account Manager III', 'strategies', 153, 'ic'),
  ('nicolleMcNulty', 'Nicolle McNulty', 'Director, Visual Communications', 'strategies', 154, 'director'),
  ('rachelMcIntire', 'Rachel McIntire', 'Senior Graphic Designer and Client Communications Manager', 'strategies', 155, 'manager'),
  ('allisonMelocik', 'Allison Melocik', 'Senior Graphic Designer II', 'strategies', 156, 'ic'),
  ('mollyManes', 'Molly Manes', 'Junior Graphic Designer', 'strategies', 157, 'ic'),
  ('selinaVoelkel', 'Selina Voelkel', 'Executive Assistant I', 'strategies', 158, 'ic'),
  ('sherryShilling', 'Sherry Shilling', 'VP of Client Engagement & Senior Account Manager', 'strategies', 159, 'vp'),
  ('anilBadruddin', 'Anil Badruddin', 'VP, AI Platform & Engineering', 'root', 161, 'vp'),
  ('josephThuman', 'Joseph Thuman', 'Director, Integrated Data & Engineering', 'root', 162, 'director'),
  ('albertChung', 'Albert Chung', '.Net Developer III', 'root', 163, 'ic'),
  ('christopherMueller', 'Christopher Mueller', 'Integration Specialist', 'root', 164, 'ic'),
  ('cowanWallace', 'Cowan Wallace', 'EDI Development Administrator II', 'root', 165, 'ic'),
  ('erinOrndoff', 'Erin Orndoff', 'Integration Specialist', 'root', 166, 'ic'),
  ('ikennaAtupulazi', 'Ikenna Atupulazi', 'Database Engineer II', 'root', 167, 'ic'),
  ('kelseyMcArthur', 'Kelsey McArthur', 'Data Engineer, Junior', 'root', 168, 'ic'),
  ('kimberlyBlevins', 'Kimberly Blevins', 'EDI Specialist, IT Liaison', 'root', 169, 'ic'),
  ('lavetteRedding', 'Lavette Redding', 'EDI Development Administrator II', 'root', 170, 'ic'),
  ('shadeekaNeville', 'Shadeeka Neville', 'EDI Development Administrator II', 'root', 171, 'ic'),
  ('stephanieNeuman', 'Stephanie Neuman', 'Integration Team Lead', 'root', 172, 'manager'),
  ('travisNeville', 'Travis Neville', 'Business Operations Analyst', 'root', 173, 'ic'),
  ('williamFinch', 'William Finch', 'Database Engineer II', 'root', 174, 'ic'),
  ('samanthaLeal', 'Samantha Leal', 'Executive Assistant I', 'root', 176, 'ic'),
  ('thomasBalloch', 'Thomas Balloch', 'VP of Infrastructure Services', 'root', 177, 'vp'),
  ('antonioJohnson', 'Antonio Johnson', 'Security Engineer I', 'root', 178, 'ic'),
  ('carlSallese', 'Carl Sallese', 'Director of Infrastructure', 'root', 179, 'director'),
  ('emilyRopka', 'Emily Ropka', 'Project Manager I', 'root', 180, 'manager'),
  ('sandraBoldman', 'Sandra Boldman', 'QA Tester II', 'root', 181, 'ic'),
  ('williamWilkie', 'William Wilkie', 'Systems Engineer IV', 'root', 182, 'ic'),
  ('williamFilling', 'William Filling', 'Systems Engineer III', 'root', 183, 'ic'),
  ('emmanuelAdetunji', 'Emmanuel Adetunji', 'Security Engineer II', 'root', 184, 'ic'),
  ('rachelWelch', 'Rachel Welch', 'Security Engineer III', 'root', 185, 'ic'),
  ('robertDoelle', 'Robert Doelle', 'Director of Technical Support', 'root', 186, 'director'),
  ('michaelAdams', 'Michael Adams', 'Technical Support Engineer II', 'root', 187, 'ic'),
  ('mustafaDarwish', 'Mustafa Darwish', 'Technical Support Engineer II - Contractor', 'root', 188, 'ic'),
  ('robertMitchell', 'Robert Mitchell', 'Technical Support Engineer II - Contractor', 'root', 189, 'ic'),
  ('russellWard', 'Russell Ward', 'Technical Support Engineer III', 'root', 190, 'ic'),
  ('samuelMello', 'Samuel Mello', 'Director, Cloud & Technical Support', 'root', 191, 'director'),
  ('nasrullahAman', 'Nasrullah Aman', 'Software Development Engineer III', 'root', 192, 'ic'),
  ('albertLahai', 'Albert Lahai', 'Unknown (IT role, title illegible - column bleed)', 'root', 193, 'ic'),
  ('joshuaCooper', 'Joshua Cooper', 'DevOps Engineer III', 'root', 194, 'ic'),
  ('rinaldyMentor', 'Rinaldy Mentor', 'DevOps Engineer II', 'root', 195, 'ic'),
  ('sujendraBista', 'Sujendra Bista', 'QA Tester II', 'root', 196, 'ic'),
  ('shawnCorsello', 'Shawn Corsello', 'Technical Support Engineer IV', 'root', 197, 'ic'),
  ('williamFancher', 'William Fancher', 'Director, NextGen Engineering', 'root', 198, 'director'),
  ('atharvaAgrawal', 'Atharva Agrawal', 'NextGen Engineer I', 'root', 199, 'ic'),
  ('benjaminEpstein', 'Benjamin Epstein', 'Power Builder Developer II', 'root', 200, 'ic'),
  ('davidWu', 'David Wu', '.Net Developer II - Contractor', 'root', 201, 'ic'),
  ('kiranMakkapati', 'Kiran Makkapati', 'Senior Lead Architect - Contractor', 'root', 202, 'ic'),
  ('lanceJanocha', 'Lance Janocha', 'UI Developer II', 'root', 203, 'ic'),
  ('lukeMacLean', 'Luke MacLean', 'NextGen Engineer I', 'root', 204, 'ic'),
  ('malcolmWhite', 'Malcolm White', 'NextGen Engineer I', 'root', 205, 'ic'),
  ('nicoleKonstantopoulos', 'Nicole Konstantopoulos', 'QA Tester III', 'root', 206, 'ic'),
  ('peterSkrzypczak', 'Peter Skrzypczak', 'QA Tester I', 'root', 207, 'ic'),
  ('ruowenWang', 'Ruowen Wang', '.Net Developer III - Contractor', 'root', 208, 'ic'),
  ('sheltonLowery', 'Shelton Lowery', '.Net Developer II', 'root', 209, 'ic'),
  ('thanhVan', 'Thanh Van', '.Net Developer I', 'root', 210, 'ic'),
  ('rodneyWilliams', 'Rodney Williams', 'Office Support', 'root', 211, 'ic'),
  ('andreaLorenc', 'Andrea Lorenc', 'UKG Solutions Consultant - HR', 'payroll', 214, 'ic'),
  ('brianGlaser', 'Brian Glaser', 'UKG Solutions Consultant - HR', 'payroll', 215, 'ic'),
  ('carolineBlaumDavis', 'Caroline BlaumDavis', 'Client Success Manager', 'payroll', 216, 'manager'),
  ('davidJohnson', 'David Johnson', 'UKG Solutions Consultant - Payroll', 'payroll', 217, 'ic'),
  ('elizabethMiller', 'Elizabeth Miller', 'Client Implementation Specialist', 'payroll', 218, 'ic'),
  ('janetTaylor', 'Janet Taylor', 'Director, Tax and Money Movement', 'payroll', 219, 'director'),
  ('chanelNance', 'Chanel Nance', 'Payroll Tax Administrator II', 'payroll', 220, 'ic'),
  ('ethanCarlstrom', 'Ethan Carlstrom', 'Operations Support Administrator', 'payroll', 221, 'ic'),
  ('samuelFlick', 'Samuel Flick', 'Payroll Tax Administrator II', 'payroll', 222, 'ic'),
  ('stevenAlford', 'Steven Alford', 'Payroll Tax Administrator I', 'payroll', 223, 'ic'),
  ('thomasPaliath', 'Thomas Paliath', 'Payroll Tax Administrator III', 'payroll', 224, 'ic'),
  ('zacharyTrieb', 'Zachary Trieb', 'Payroll Tax Administrator I', 'payroll', 225, 'ic'),
  ('jenniSoumah', 'Jenni Soumah', 'Director of Payroll Service & Distribution', 'payroll', 226, 'director'),
  ('florenceCronan', 'Florence Cronan', 'Operations Team Administrator', 'payroll', 227, 'ic'),
  ('hollyCorsello', 'Holly Corsello', 'Manager, Payroll Account Services', 'payroll', 228, 'manager'),
  ('angelaMoore', 'Angela Moore', 'Dedicated Payroll Representative', 'payroll', 229, 'ic'),
  ('constanceParker', 'Constance Parker', 'Dedicated Payroll Representative', 'payroll', 230, 'ic'),
  ('deniseMattias', 'Denise Mattias', 'Dedicated Payroll Representative', 'payroll', 231, 'ic'),
  ('jessicaMantegna', 'Jessica Mantegna', 'Payroll Service Support Administrator', 'payroll', 232, 'ic'),
  ('krystalynneCortez', 'Krystalynne Cortez', 'Dedicated Payroll Representative', 'payroll', 233, 'ic'),
  ('mckaylaMartin', 'McKayla Martin', 'Dedicated Payroll Representative', 'payroll', 234, 'ic'),
  ('reginaFinck', 'Regina Finck', 'Dedicated Payroll Representative', 'payroll', 235, 'ic'),
  ('tammyHoltman', 'Tammy Holtman', 'Dedicated Payroll Representative', 'payroll', 236, 'ic'),
  ('tylerDover', 'Tyler Dover', 'Dedicated Payroll Representative', 'payroll', 237, 'ic'),
  ('violetLee', 'Violet Lee', 'Dedicated Payroll Representative', 'payroll', 238, 'ic'),
  ('jenniferKnauff', 'Jennifer Knauff', 'Dedicated Payroll Representative', 'payroll', 239, 'ic'),
  ('joshuaMace', 'Joshua Mace', 'Distribution Specialist', 'payroll', 240, 'ic'),
  ('kaseyKappler', 'Kasey Kappler', 'Client Support Specialist, UKG', 'payroll', 241, 'ic'),
  ('katlynBaer', 'Katlyn Baer', 'Client Support Specialist, UKG', 'payroll', 242, 'ic'),
  ('shawntriceFerguson', 'Shawntrice Ferguson', 'Senior Distribution Specialist', 'payroll', 243, 'ic'),
  ('shenitaErvin', 'Shenita Ervin', 'Operations Team Administrator', 'payroll', 244, 'ic'),
  ('katieRobinson', 'Katie Robinson', 'Director, Integration & Interfaces', 'payroll', 245, 'director'),
  ('alexanderRoche', 'Alexander Roche', 'UKG Solutions Consultant - TLM', 'payroll', 246, 'ic'),
  ('emilyKeever', 'Emily Keever', 'UKG Solutions Consultant - HR', 'payroll', 247, 'ic'),
  ('evanWolfsonStofko', 'Evan Wolfson-Stofko', 'Product Manager - KBP', 'payroll', 248, 'manager'),
  ('kaseyPhelan', 'Kasey Phelan', 'Product Manager - KBP', 'payroll', 249, 'manager'),
  ('kevinSchnitker', 'Kevin Schnitker', 'UKG Solutions Consultant - Payroll', 'payroll', 250, 'ic'),
  ('kierraRadcliffe', 'Kierra Radcliffe', 'Product Manager - KBP', 'payroll', 251, 'manager'),
  ('shannonGoscinski', 'Shannon Goscinski', 'HR Compliance Support', 'payroll', 252, 'ic'),
  ('staceyRacine', 'Stacey Racine', 'UKG Solutions Consultant - HR', 'payroll', 253, 'ic'),
  ('traceyWilliams', 'Tracey Williams', 'Product Manager - KBP', 'payroll', 254, 'manager'),
  ('kimberlyFunk', 'Kimberly Funk', 'Assistant Manager, Onboarding & Implementation', 'payroll', 255, 'manager'),
  ('leahDeGross', 'Leah DeGross', 'Manager, Payroll Account Services', 'payroll', 256, 'manager'),
  ('madelaineSomarriba', 'Madelaine Somarriba', 'Chief of Staff, Kelly Benefits Payroll', 'payroll', 257, 'vp'),
  ('phyllisOstendorf', 'Phyllis Ostendorf', 'Client Implementation Specialist', 'payroll', 258, 'ic'),
  ('saraRuffner', 'Sara Ruffner', 'Dedicated Payroll Representative', 'payroll', 259, 'ic'),
  ('stacyMcCue', 'Stacy McCue', 'VP, Strategic Partnerships', 'payroll', 260, 'vp'),
  ('whitneyMcMillian', 'Whitney McMillian', 'Client Success Manager', 'payroll', 261, 'manager'),
  ('benjaminMayer', 'Benjamin Mayer', 'KBA Analyst', 'advantage', 263, 'ic'),
  ('joannaMarinopoulos', 'Joanna Marinopoulos', 'First Impressions & Customer Care Ambassador', 'advantage', 264, 'ic'),
  ('matthewCrowner', 'Matthew Crowner', 'VP of POD Operations', 'advantage', 265, 'vp'),
  ('daphneLeedy', 'Daphne Leedy', 'Ancillary Specialist', 'advantage', 266, 'ic'),
  ('ericaGageby', 'Erica Gageby', 'Selerix Team Manager', 'advantage', 267, 'manager'),
  ('ianBurrough', 'Ian Burrough', 'Selerix Casebuilder', 'advantage', 268, 'ic'),
  ('lukeBurrough', 'Luke Burrough', 'Selerix Casebuilder & EDI Specialist', 'advantage', 269, 'ic'),
  ('melissaLemaster', 'Melissa Lemaster', 'Broker Manager, Customer Care Admin', 'advantage', 270, 'manager'),
  ('rebeccaSnyder', 'Rebecca Snyder', 'Manager of Customer Care Administration', 'advantage', 271, 'manager'),
  ('tinaNichols', 'Tina Nichols', 'Enrollment Specialist II', 'advantage', 272, 'ic'),
  ('stevenPyzik', 'Steven Pyzik', 'Vice President of Enrollment, Reconciliation & Service', 'advantage', 273, 'vp'),
  ('amberManekia', 'Amber Manekia', 'Manager, Client Experience', 'advantage', 274, 'manager'),
  ('abigailBreschi', 'Abigail Breschi', 'Customer Care Advocate', 'advantage', 275, 'ic'),
  ('alondreaWilliams', 'Alondrea Williams', 'Customer Care Advocate', 'advantage', 276, 'ic'),
  ('deloraLaroccoSchavier', 'Delora LaRocco Schavier', 'Customer Care Advocate', 'advantage', 277, 'ic'),
  ('jamarDowdye', 'Jamar Dowdye', 'Customer Care Advocate', 'advantage', 278, 'ic'),
  ('jordanMiles', 'Jordan Miles', 'Customer Care Advocate', 'advantage', 279, 'ic'),
  ('lauraHalsey', 'Laura Halsey', 'Senior Customer Care Advocate', 'advantage', 280, 'ic'),
  ('laurenGiblin', 'Lauren Giblin', 'Customer Care Advocate', 'advantage', 281, 'ic'),
  ('madisonVanik', 'Madison Vanik', 'Customer Care Advocate', 'advantage', 282, 'ic'),
  ('michaelVonRinteln', 'Michael von Rinteln', 'Customer Care Advocate', 'advantage', 283, 'ic'),
  ('paulLeary', 'Paul Leary', 'Customer Care Advocate', 'advantage', 284, 'ic'),
  ('elizabethCramer', 'Elizabeth Cramer', 'Manager, Caller Experience', 'advantage', 285, 'manager'),
  ('allisonVolcy', 'Allison Volcy', 'Customer Care Advocate', 'advantage', 286, 'ic'),
  ('carlaLangley', 'Carla Langley', 'Customer Care Advocate', 'advantage', 287, 'ic'),
  ('gloriaMeredith', 'Gloria Meredith', 'Customer Care Advocate', 'advantage', 288, 'ic'),
  ('grantNewcome', 'Grant Newcome', 'Customer Care Advocate', 'advantage', 289, 'ic'),
  ('jaeChong', 'Jae Chong', 'Customer Care Advocate', 'advantage', 290, 'ic'),
  ('leontyneBurbridge', 'Leontyne Burbridge', 'Customer Care Advocate', 'advantage', 291, 'ic'),
  ('leslieBrown', 'Leslie Brown', 'Customer Care Advocate', 'advantage', 292, 'ic'),
  ('nevaehWilliams', 'Nevaeh Williams', 'Customer Care Advocate', 'advantage', 293, 'ic'),
  ('tatiaBell', 'Tatia Bell', 'Customer Care Advocate', 'advantage', 294, 'ic'),
  ('tyreeseNeal', 'Tyreese Neal', 'Customer Care Advocate', 'advantage', 295, 'ic'),
  ('heatherWilliams', 'Heather Williams', 'COBRA Administrator II', 'advantage', 296, 'ic'),
  ('heribertoFauth', 'Heriberto Fauth', 'COBRA Administrator I', 'advantage', 297, 'ic'),
  ('jamesMackintosh', 'James Mackintosh', 'Director, Enrollment & Eligibility Management', 'advantage', 298, 'director'),
  ('christieCarlton', 'Christie Carlton', 'Enrollment Process & Insights...', 'advantage', 299, 'ic'),
  ('danielleNaumann', 'Danielle Naumann', 'Enrollment Production Lead', 'advantage', 300, 'manager'),
  ('rickySchafer', 'Ricky Schafer', 'Manager of Enrollment', 'advantage', 301, 'manager'),
  ('christinaKirby', 'Christina Kirby', 'Enrollment Administrator', 'advantage', 302, 'ic'),
  ('danielleBinnie', 'Danielle Binnie', 'Enrollment Administrator', 'advantage', 303, 'ic'),
  ('hannahYoung', 'Hannah Young', 'Enrollment Administrator', 'advantage', 304, 'ic'),
  ('jadeReall', 'Jade Reall', 'Enrollment Administrator', 'advantage', 305, 'ic'),
  ('jamesDorseyIII', 'James Dorsey III', 'Enrollment Administrator', 'advantage', 306, 'ic'),
  ('juliannaSchaeffer', 'Julianna Schaeffer', 'Enrollment Administrator', 'advantage', 307, 'ic'),
  ('julieFox', 'Julie Fox', 'Enrollment Administrator', 'advantage', 308, 'ic'),
  ('kimberlyHunter', 'Kimberly Hunter', 'Enrollment Administrator', 'advantage', 309, 'ic'),
  ('oliviaFinch', 'Olivia Finch', 'Enrollment Administrator', 'advantage', 310, 'ic'),
  ('robinVanik', 'Robin Vanik', 'Manager of Enrollment', 'advantage', 311, 'manager'),
  ('amyParsley', 'Amy Parsley', 'Enrollment Specialist', 'advantage', 312, 'ic'),
  ('christinaMobley', 'Christina Mobley', 'Enrollment Specialist', 'advantage', 313, 'ic'),
  ('christineHollenack', 'Christine Hollenack', 'Enrollment Administrator', 'advantage', 314, 'ic'),
  ('dannyDaneker', 'Danny Daneker', 'Enrollment Administrator', 'advantage', 315, 'ic'),
  ('joyWiegand', 'Joy Wiegand', 'Enrollment Administrator', 'advantage', 316, 'ic'),
  ('karenMatthews', 'Karen Matthews', 'Enrollment Specialist', 'advantage', 317, 'ic'),
  ('katieVia', 'Katie Via', 'Enrollment Specialist', 'advantage', 318, 'ic'),
  ('mandyKessler', 'Mandy Kessler', 'Enrollment Administrator', 'advantage', 319, 'ic'),
  ('markBrennan', 'Mark Brennan', 'File Clerk', 'advantage', 320, 'ic'),
  ('samanthaLudwig', 'Samantha Ludwig', 'Enrollment Administrator', 'advantage', 321, 'ic'),
  ('saraDougherty', 'Sara Dougherty', 'MIF Administrator', 'advantage', 322, 'ic'),
  ('valerieGaugler', 'Valerie Gaugler', 'Enrollment Specialist', 'advantage', 323, 'ic'),
  ('valerieLewis', 'Valerie Lewis', 'Enrollment Specialist', 'advantage', 324, 'ic'),
  ('willisiaSmith', 'Willisia Smith', 'Enrollment Specialist', 'advantage', 325, 'ic'),
  ('jessicaEdwards', 'Jessica Edwards', 'COBRA Team Leader', 'advantage', 326, 'manager'),
  ('kellyKernan', 'Kelly Kernan', 'Director, Dedicated Service', 'advantage', 327, 'director'),
  ('alejandraBentley', 'Alejandra Bentley', 'Dedicated Service Representative I', 'advantage', 328, 'ic'),
  ('courtneyLecates', 'Courtney Lecates', 'Dedicated Service Representative I', 'advantage', 329, 'ic'),
  ('georgiaFrangos', 'Georgia Frangos', 'Billing Administrator I', 'advantage', 330, 'ic'),
  ('hannahIngham', 'Hannah Ingham', 'Dedicated Service Representative I', 'advantage', 331, 'ic'),
  ('jacondaBrown', 'Jaconda Brown', 'Dedicated Service Representative I', 'advantage', 332, 'ic'),
  ('kellyCarlstrom', 'Kelly Carlstrom', 'Dedicated Service Representative II', 'advantage', 333, 'ic'),
  ('kimberlyKotwica', 'Kimberly Kotwica', 'Manager, LG Dedicated Service', 'advantage', 334, 'manager'),
  ('amieErline', 'Amie Erline', 'Dedicated Service Representative I', 'advantage', 335, 'ic'),
  ('brechinVail', 'Brechin Vail', 'Dedicated Service Representative II', 'advantage', 336, 'ic'),
  ('dakotaCrabtree', 'Dakota Crabtree', 'Dedicated Service Representative I', 'advantage', 337, 'ic'),
  ('debraLynnSigai', 'Debra-Lynn Sigai', 'Dedicated Service Representative I', 'advantage', 338, 'ic'),
  ('elizabethReid', 'Elizabeth Reid', 'Dedicated Service Representative I', 'advantage', 339, 'ic'),
  ('justinaMoses', 'Justina Moses', 'Dedicated Service Representative II', 'advantage', 340, 'ic'),
  ('kaliopiAvgerinos', 'Kaliopi Avgerinos', 'Dedicated Service Representative I', 'advantage', 341, 'ic'),
  ('magnoliaKoutelis', 'Magnolia Koutelis', 'Dedicated Service Representative II', 'advantage', 342, 'ic'),
  ('susanSommerfeld', 'Susan Sommerfeld', 'Dedicated Service Representative I', 'advantage', 343, 'ic'),
  ('laurenLong', 'Lauren Long', 'Senior Customer Care Advocate', 'advantage', 344, 'ic'),
  ('shannonWilson', 'Shannon Wilson', 'Manager of Dedicated Service', 'advantage', 345, 'manager'),
  ('adamChaney', 'Adam Chaney', 'Dedicated Service Representative I', 'advantage', 346, 'ic'),
  ('ashleyBarber', 'Ashley Barber', 'Dedicated Service Representative I', 'advantage', 347, 'ic'),
  ('brittanyDriscoll', 'Brittany Driscoll', 'Dedicated Service Representative II', 'advantage', 348, 'ic'),
  ('demetriaGaines', 'Demetria Gaines', 'Dedicated Service Representative I', 'advantage', 349, 'ic'),
  ('jessicaGreene', 'Jessica Greene', 'Dedicated Service Representative I', 'advantage', 350, 'ic'),
  ('kimberlyWhite', 'Kimberly White', 'Dedicated Service Representative II', 'advantage', 351, 'ic'),
  ('lishaIacovelli', 'Lisha Iacovelli', 'Dedicated Service Representative II', 'advantage', 352, 'ic'),
  ('shannonStein', 'Shannon Stein', 'Dedicated Service Representative II', 'advantage', 353, 'ic'),
  ('suzanneThomas', 'Suzanne Thomas', 'Dedicated Service Representative I', 'advantage', 354, 'ic'),
  ('sondaFleming', 'Sonda Fleming', 'Dedicated Service Representative II', 'advantage', 355, 'ic'),
  ('taishaLawrence', 'Taisha Lawrence', 'Dedicated Service Representative I', 'advantage', 356, 'ic'),
  ('trinityGarcia', 'Trinity Garcia', 'Dedicated Service Representative I', 'advantage', 357, 'ic'),
  ('maryWillard', 'Mary Willard', 'Manager, Enrollment Reconciliation', 'advantage', 358, 'manager'),
  ('andreaRijos', 'Andrea Rijos', 'EDI Administrator, Team Leader/Trainer', 'advantage', 359, 'manager'),
  ('daShaeThomas', 'Da''Shae Thomas', 'EDI Administrator I', 'advantage', 360, 'ic'),
  ('danielleHimes', 'Danielle Himes', 'Enrollment Reconciliation Specialist', 'advantage', 361, 'ic'),
  ('johnLanahan', 'John Lanahan', 'Enrollment Reconciliation Administrator', 'advantage', 362, 'ic'),
  ('lamontDarden', 'Lamont Darden', 'Enrollment Reconciliation Administrator', 'advantage', 363, 'ic'),
  ('laurieMartin', 'Laurie Martin', 'Enrollment Reconciliation Administrator', 'advantage', 364, 'ic'),
  ('mahaliaHarrison', 'Mahalia Harrison', 'EDI Administrator I', 'advantage', 365, 'ic'),
  ('paulineCox', 'Pauline Cox', 'Enrollment Reconciliation Administrator', 'advantage', 366, 'ic'),
  ('taylorJonesLee', 'Taylor Jones-Lee', 'EDI Administrator I', 'advantage', 367, 'ic'),
  ('treneFuller', 'Trene Fuller', 'Enrollment Reconciliation Administrator', 'advantage', 368, 'ic'),
  ('taraGaskins', 'Tara Gaskins', 'COBRA Administrator II', 'advantage', 369, 'ic'),
  ('williamCarlton', 'William Carlton', 'Strategic Initiatives Lead', 'advantage', 370, 'manager'),
  ('amyGlorioso', 'Amy Glorioso', 'Unknown (title illegible - column bleed in source)', 'root', 371, 'ic'),
  ('anupamaAkunuri', 'Anupama Akunuri', 'Unknown (title illegible - column bleed in source)', 'root', 372, 'ic'),
  ('julieLanahan', 'Julie Lanahan', 'Departmental Assistant', 'root', 373, 'ic'),
  ('lucySchultz', 'Lucy Schultz', 'Enterprise Wide Solutions Leader', 'root', 374, 'manager'),
  ('richardHarrison', 'Richard Harrison', 'Senior Salesforce Administrator', 'root', 375, 'ic'),
  ('michaelBatley', 'Michael Batley', 'Unknown (title illegible - column bleed in source)', 'root', 376, 'ic'),
  ('michaelCaralle', 'Michael Caralle', 'Unknown (title illegible - column bleed in source)', 'root', 377, 'ic'),
  ('christinaFrank', 'Christina Frank', 'Payroll Audit Administrator', 'root', 379, 'ic'),
  ('jenniferCohen', 'Jennifer Cohen', 'Learning Program Manager', 'root', 380, 'manager'),
  ('marcyGrenier', 'Marcy Grenier', 'Learning Facilitator', 'root', 381, 'ic'),
  ('markGoscinski', 'Mark Goscinski', 'Trend Analysis Specialist', 'root', 382, 'ic'),
  ('sandyFalsis', 'Sandy Falsis', 'Manager, Quality Audit', 'root', 383, 'manager'),
  ('cherieGreen', 'Cherie Green', 'QA Specialist', 'root', 384, 'ic'),
  ('caseyKongsted', 'Casey Kongsted', 'Learning Specialist', 'root', 385, 'ic'),
  ('collinMeredith', 'Collin Meredith', 'Learning Specialist', 'root', 386, 'ic'),
  ('aprilRamsey', 'April Ramsey', 'QA Specialist', 'root', 387, 'ic'),
  ('carrieDuffy', 'Carrie Duffy', 'QA Specialist', 'root', 388, 'ic'),
  ('laceyGoff', 'Lacey Goff', 'QA Auditor', 'root', 389, 'ic'),
  ('riemanJenkins', 'Rieman Jenkins', 'QA Auditor', 'root', 390, 'ic'),
  ('samuelNorris', 'Samuel Norris', 'QA Auditor', 'root', 391, 'ic'),
  ('williamPinkine', 'William Pinkine', 'QA Auditor', 'root', 392, 'ic'),
  ('timothyWorkman', 'Timothy Workman', 'Carrier Audit Specialist II', 'root', 393, 'ic'),
  ('timothyJones', 'Timothy Jones', 'Training Facilitator', 'root', 394, 'ic'),
  ('zacharyShalit', 'Zachary Shalit', 'Employee & Client Enablement Leader', 'root', 395, 'manager'),
  ('christieOpitz', 'Christie Opitz', 'VP of Implementation & Broker Solutions', 'advantage', 397, 'vp'),
  ('kariOldenburg', 'Kari Oldenburg', 'VP, Broker Sales Executive', 'advantage', 398, 'vp'),
  ('kathleenGier', 'Kathleen Gier', 'SVP of National Sales', 'advantage', 399, 'svp'),
  ('kellyWilson', 'Kelly Wilson', 'SVP of National Sales', 'advantage', 400, 'svp'),
  ('micheleSargent', 'Michele Sargent', 'Director of Broker & Client Managers', 'advantage', 401, 'director'),
  ('michelleBirth', 'Michelle Birth', 'Vendor Operations Manager', 'advantage', 402, 'manager'),
  ('sherriMartak', 'Sherri Martak', 'New Business & Proposal Specialist', 'advantage', 403, 'ic'),
  ('whitneyEllis', 'Whitney Ellis', 'Senior Project Manager', 'advantage', 404, 'manager'),
  ('danyellAmos', 'Danyell Amos', 'Director of Implementation', 'advantage', 405, 'director'),
  ('alisshaRoden', 'Alissha Roden', 'Dedicated Service Representative, DC', 'advantage', 406, 'ic'),
  ('amandaCollierNystrom', 'Amanda Collier-Nystrom', 'Client Implementation Administrator', 'advantage', 407, 'ic'),
  ('belindaAdams', 'Belinda Adams', 'Client Implementation Administrator', 'advantage', 408, 'ic'),
  ('crystalWalker', 'Crystal Walker', 'Client Implementation Administrator', 'advantage', 409, 'ic'),
  ('deannaHollar', 'Deanna Hollar', 'Client Implementation Administrator', 'advantage', 410, 'ic'),
  ('ericaJohnson', 'Erica Johnson', 'Client Implementation Team Specialist', 'advantage', 411, 'ic'),
  ('lutieLink', 'Lutie Link', 'Dedicated Service Representative, DC', 'advantage', 412, 'ic'),
  ('meganSallese', 'Megan Sallese', 'Client Implementation Team Specialist', 'advantage', 413, 'ic'),
  ('samanthaWebb', 'Samantha Webb', 'Client Implementation Administrator', 'advantage', 414, 'ic'),
  ('savannahHarris', 'Savannah Harris', 'Implementation Billing Specialist', 'advantage', 415, 'ic'),
  ('sonyaMeilhammer', 'Sonya Meilhammer', 'Client Implementation Administrator', 'advantage', 416, 'ic'),
  ('tammyleeGodwin', 'Tammylee Godwin', 'Benefits and Payroll Implementation Specialist', 'advantage', 417, 'ic'),
  ('kathleenCampbell', 'Kathleen Campbell', 'Client Implementation Administrator', 'advantage', 418, 'ic'),
  ('heatherMiller', 'Heather Miller', 'Manager, Implementation & Quality Control', 'advantage', 419, 'manager'),
  ('adrianaCollier', 'Adriana Collier', 'Internal Audit Specialist', 'advantage', 420, 'ic'),
  ('amyEisemann', 'Amy Eisemann', 'Client Implementation Administrator', 'advantage', 421, 'ic'),
  ('ashleyPrice', 'Ashley Price', 'Client Implementation Administrator', 'advantage', 422, 'ic'),
  ('baileyVia', 'Bailey Via', 'Client Implementation Administrator', 'advantage', 423, 'ic'),
  ('carrieGonzalez', 'Carrie Gonzalez', 'Implementation Workflow Specialist', 'advantage', 424, 'ic'),
  ('christineMills', 'Christine Mills', 'Implementation Broker Support Specialist', 'advantage', 425, 'ic'),
  ('erikaOkehie', 'Erika Okehie', 'Client Implementation Administrator', 'advantage', 426, 'ic'),
  ('galeCarlton', 'Gale Carlton', 'Renewal Production Specialist', 'advantage', 427, 'ic'),
  ('jenniferThuman', 'Jennifer Thuman', 'Implementation Support Specialist', 'advantage', 428, 'ic'),
  ('katherineDietz', 'Katherine Dietz', 'Renewal Production Specialist', 'advantage', 429, 'ic'),
  ('margaretFrench', 'Margaret French', 'Implementation Audit Specialist', 'advantage', 430, 'ic'),
  ('richardFlores', 'Richard Flores', 'Client Implementation Administrator', 'advantage', 431, 'ic'),
  ('riverMartinezBarton', 'River Martinez Barton', 'Client Web Support Specialist', 'advantage', 432, 'ic'),
  ('shauntayParrish', 'Shauntay Parrish', 'Client Implementation Administrator', 'advantage', 433, 'ic'),
  ('vanessaWaltman', 'Vanessa Waltman', 'Manager, Small Group Carrier Implementation', 'advantage', 434, 'manager'),
  ('elizabethRatchford', 'Elizabeth Ratchford', 'Implementation Coordinator', 'advantage', 435, 'ic'),
  ('helanaAmos', 'Helana Amos', 'Implementation Coordinator', 'advantage', 436, 'ic'),
  ('kathrynBenson', 'Kathryn Benson', 'Implementation Coordinator', 'advantage', 437, 'ic'),
  ('kourtneyBrown', 'Kourtney Brown', 'Implementation Coordinator', 'advantage', 438, 'ic'),
  ('shaneklaFrazier', 'Shanekla Frazier', 'Implementation Coordinator', 'advantage', 439, 'ic'),
  ('stephenWaldron', 'Stephen Waldron', 'Ancillary Specialist', 'advantage', 440, 'ic'),
  ('kellyStafford', 'Kelly Stafford', 'Assistant Manager of Small Group Carrier Implementation', 'advantage', 441, 'manager'),
  ('adamGordy', 'Adam Gordy', 'Manager of Client Managers', 'advantage', 442, 'manager'),
  ('jordanWiegand', 'Jordan Wiegand', 'Client Manager - KBS', 'advantage', 443, 'ic'),
  ('zacharySpivey', 'Zachary Spivey', 'Client Manager - KBS', 'advantage', 444, 'ic'),
  ('marcusCarroll', 'Marcus Carroll', 'Broker Manager', 'advantage', 445, 'ic'),
  ('carolineSavin', 'Caroline Savin', 'Manager of Small Group Broker Management', 'advantage', 446, 'manager'),
  ('angelaMcGraw', 'Angela McGraw', 'Broker Manager, Small Group', 'advantage', 447, 'ic'),
  ('patrickKavanagh', 'Patrick Kavanagh', 'Broker Manager, Small Group', 'advantage', 448, 'ic'),
  ('stevenVannoy', 'Steven Vannoy', 'Broker Manager, Small Group and Business Analyst', 'advantage', 449, 'ic'),
  ('karenSeybold', 'Karen Seybold', 'Broker Sales Executive, National Sales', 'advantage', 450, 'ic'),
  ('gregoryGarvin', 'Gregory Garvin', 'Broker Manager, Large Group', 'advantage', 451, 'ic'),
  ('jenniferBalducci', 'Jennifer Balducci', 'Client Implementation & BOR Specialist', 'advantage', 452, 'ic'),
  ('brendaRivera', 'Brenda Rivera', 'Broker Manager, Large Group', 'advantage', 453, 'ic'),
  ('dianeBrooks', 'Diane Brooks', 'Broker Manager, Large Group', 'advantage', 454, 'ic'),
  ('ginaIampieri', 'Gina Iampieri', 'Broker Manager, Large Group', 'advantage', 455, 'ic'),
  ('jeanButz', 'Jean Butz', 'Broker Manager, Large Group', 'advantage', 456, 'ic'),
  ('kaylaRhaeJohnson', 'Kayla-Rhae Johnson', 'Broker Manager, Large Group', 'advantage', 457, 'ic'),
  ('nishaThompson', 'Nisha Thompson', 'Broker Manager, Large Group', 'advantage', 458, 'ic'),
  ('tammieGillespie', 'Tammie Gillespie', 'Broker Manager, Large Group', 'advantage', 459, 'ic'),
  ('thomasVanik', 'Thomas Vanik', 'Broker Manager, Large Group', 'advantage', 460, 'ic'),
  ('amyDeCoursey', 'Amy DeCoursey', 'Proposal Analyst, FT', 'advantage', 461, 'ic'),
  ('renicaBoone', 'Renica Boone', 'Dedicated Service Representative I', 'advantage', 462, 'ic'),
  ('terriPhillips', 'Terri Phillips', 'Dedicated Service Representative II', 'advantage', 463, 'ic');

-- ============ PASS 3: manager_id backfill -- run only after all inserts above exist ============
update org_people set manager_id = 'fx3' where id = 'bryanKelly';
update org_people set manager_id = 'fx3' where id = 'davidKellySr';
update org_people set manager_id = 'fx3' where id = 'frankIII';
update org_people set manager_id = 'fx3' where id = 'johnKelly';
update org_people set manager_id = 'bryanKelly' where id = 'staceyZour';
update org_people set manager_id = 'staceyZour' where id = 'garrettKalb';
update org_people set manager_id = 'davidKellySr' where id = 'kevinHuntley';
update org_people set manager_id = 'kevinHuntley' where id = 'andrewRoberts';
update org_people set manager_id = 'kevinHuntley' where id = 'annieMartin';
update org_people set manager_id = 'kevinHuntley' where id = 'avaFerrara';
update org_people set manager_id = 'kevinHuntley' where id = 'colinHeacock';
update org_people set manager_id = 'kevinHuntley' where id = 'dianaRawlings';
update org_people set manager_id = 'kevinHuntley' where id = 'jamesBrownPayroll';
update org_people set manager_id = 'kevinHuntley' where id = 'michaelaKammer';
update org_people set manager_id = 'kevinHuntley' where id = 'patrickReed';
update org_people set manager_id = 'kevinHuntley' where id = 'tracyBrubaker';
update org_people set manager_id = 'davidKellySr' where id = 'rachelMorton';
update org_people set manager_id = 'davidKellySr' where id = 'robertPfeifer';
update org_people set manager_id = 'robertPfeifer' where id = 'breannaLamb';
update org_people set manager_id = 'robertPfeifer' where id = 'brendanCohen';
update org_people set manager_id = 'robertPfeifer' where id = 'danteHines';
update org_people set manager_id = 'frankIII' where id = 'craig';
update org_people set manager_id = 'craig' where id = 'josephCunningham';
update org_people set manager_id = 'josephCunningham' where id = 'jenniferButcher';
update org_people set manager_id = 'josephCunningham' where id = 'mariaDonatelli';
update org_people set manager_id = 'josephCunningham' where id = 'michaelNwaosuagwu';
update org_people set manager_id = 'craig' where id = 'katherineMerrey';
update org_people set manager_id = 'katherineMerrey' where id = 'abigailAugustitus';
update org_people set manager_id = 'craig' where id = 'kimberlyOlson';
update org_people set manager_id = 'craig' where id = 'trish';
update org_people set manager_id = 'trish' where id = 'kellyMcHoul';
update org_people set manager_id = 'trish' where id = 'pamelaDelVecchio';
update org_people set manager_id = 'trish' where id = 'sarahGoodfriend';
update org_people set manager_id = 'trish' where id = 'theressiaShoup';
update org_people set manager_id = 'craig' where id = 'ryanAdams';
update org_people set manager_id = 'ryanAdams' where id = 'bethelihemGebeyehu';
update org_people set manager_id = 'craig' where id = 'trudyInnerst';
update org_people set manager_id = 'trudyInnerst' where id = 'amandaVailati';
update org_people set manager_id = 'trudyInnerst' where id = 'derekHirsch';
update org_people set manager_id = 'derekHirsch' where id = 'aaronCopenhaver';
update org_people set manager_id = 'derekHirsch' where id = 'anthonyAbraham';
update org_people set manager_id = 'derekHirsch' where id = 'codyCorsello';
update org_people set manager_id = 'derekHirsch' where id = 'dorianBock';
update org_people set manager_id = 'derekHirsch' where id = 'ginaWallace';
update org_people set manager_id = 'trudyInnerst' where id = 'diannaMcElwain';
update org_people set manager_id = 'trudyInnerst' where id = 'jenniferRinaudo';
update org_people set manager_id = 'trudyInnerst' where id = 'reionnaGross';
update org_people set manager_id = 'craig' where id = 'williamCopenhaver';
update org_people set manager_id = 'williamCopenhaver' where id = 'brendaBachman';
update org_people set manager_id = 'williamCopenhaver' where id = 'matthewSeifert';
update org_people set manager_id = 'matthewSeifert' where id = 'austinSynan';
update org_people set manager_id = 'williamCopenhaver' where id = 'michaelGreen';
update org_people set manager_id = 'williamCopenhaver' where id = 'samanthaTrcka';
update org_people set manager_id = 'samanthaTrcka' where id = 'amyGentner';
update org_people set manager_id = 'samanthaTrcka' where id = 'dorcasWaichigo';
update org_people set manager_id = 'samanthaTrcka' where id = 'katelynneRodgers';
update org_people set manager_id = 'samanthaTrcka' where id = 'sueBowmaster';
update org_people set manager_id = 'samanthaTrcka' where id = 'tylerYoung';
update org_people set manager_id = 'williamCopenhaver' where id = 'shawnZollicoffer';
update org_people set manager_id = 'frankIII' where id = 'jen';
update org_people set manager_id = 'jen' where id = 'heatherBroadhead';
update org_people set manager_id = 'jen' where id = 'jacquelineHeffner';
update org_people set manager_id = 'jacquelineHeffner' where id = 'amandaMerrey';
update org_people set manager_id = 'jacquelineHeffner' where id = 'brettShinsky';
update org_people set manager_id = 'jacquelineHeffner' where id = 'jenniferJardell';
update org_people set manager_id = 'jacquelineHeffner' where id = 'jessicaPotter';
update org_people set manager_id = 'jacquelineHeffner' where id = 'heatherKness';
update org_people set manager_id = 'jen' where id = 'michaelLittle';
update org_people set manager_id = 'frankIII' where id = 'mackenzieTurpin';
update org_people set manager_id = 'mackenzieTurpin' where id = 'ingridKirkman';
update org_people set manager_id = 'johnKelly' where id = 'jasonDanner';
update org_people set manager_id = 'jasonDanner' where id = 'jessicaBickley';
update org_people set manager_id = 'johnKelly' where id = 'johnKellyRA';
update org_people set manager_id = 'johnKellyRA' where id = 'alfredSanto';
update org_people set manager_id = 'johnKellyRA' where id = 'christopherCarroll';
update org_people set manager_id = 'johnKellyRA' where id = 'christopherHolt';
update org_people set manager_id = 'christopherHolt' where id = 'drewLaundry';
update org_people set manager_id = 'christopherHolt' where id = 'kyleSavick';
update org_people set manager_id = 'christopherHolt' where id = 'williamMarshall';
update org_people set manager_id = 'johnKellyRA' where id = 'davidKellyJr';
update org_people set manager_id = 'johnKellyRA' where id = 'davidPitz';
update org_people set manager_id = 'johnKellyRA' where id = 'jamesCrowley';
update org_people set manager_id = 'jamesCrowley' where id = 'bernElCooper';
update org_people set manager_id = 'jamesCrowley' where id = 'brianHubbard';
update org_people set manager_id = 'jamesCrowley' where id = 'carolynKingan';
update org_people set manager_id = 'jamesCrowley' where id = 'cherylHinchy';
update org_people set manager_id = 'jamesCrowley' where id = 'ericLeikach';
update org_people set manager_id = 'jamesCrowley' where id = 'greggSimmons';
update org_people set manager_id = 'jamesCrowley' where id = 'heatherHall';
update org_people set manager_id = 'jamesCrowley' where id = 'kellieHopkins';
update org_people set manager_id = 'jamesCrowley' where id = 'kimberleeBosley';
update org_people set manager_id = 'jamesCrowley' where id = 'lisaJolles';
update org_people set manager_id = 'jamesCrowley' where id = 'loisSheely';
update org_people set manager_id = 'jamesCrowley' where id = 'markBarney';
update org_people set manager_id = 'jamesCrowley' where id = 'markHammett';
update org_people set manager_id = 'jamesCrowley' where id = 'natalieSiciliano';
update org_people set manager_id = 'jamesCrowley' where id = 'jeffreyPedone';
update org_people set manager_id = 'johnKellyRA' where id = 'jarrettJedlicka';
update org_people set manager_id = 'johnKellyRA' where id = 'lukeCaplan';
update org_people set manager_id = 'johnKellyRA' where id = 'markKauffman';
update org_people set manager_id = 'johnKellyRA' where id = 'michaelKelly';
update org_people set manager_id = 'johnKelly' where id = 'josephDiMaggio';
update org_people set manager_id = 'josephDiMaggio' where id = 'benjaminDutcher';
update org_people set manager_id = 'josephDiMaggio' where id = 'cheriWheeler';
update org_people set manager_id = 'josephDiMaggio' where id = 'danielleOrtman';
update org_people set manager_id = 'josephDiMaggio' where id = 'frederickDanner';
update org_people set manager_id = 'josephDiMaggio' where id = 'johnNewcome';
update org_people set manager_id = 'josephDiMaggio' where id = 'lawrenceDevitt';
update org_people set manager_id = 'johnKelly' where id = 'josh';
update org_people set manager_id = 'josh' where id = 'ashleyHumphries';
update org_people set manager_id = 'johnKelly' where id = 'katharineLochte';
update org_people set manager_id = 'katharineLochte' where id = 'amandaSaulsbury';
update org_people set manager_id = 'katharineLochte' where id = 'amyNovotny';
update org_people set manager_id = 'amyNovotny' where id = 'donnaWelsh';
update org_people set manager_id = 'katharineLochte' where id = 'andreaWinfrey';
update org_people set manager_id = 'andreaWinfrey' where id = 'allieDelain';
update org_people set manager_id = 'andreaWinfrey' where id = 'brookeLosin';
update org_people set manager_id = 'andreaWinfrey' where id = 'danaCahill';
update org_people set manager_id = 'andreaWinfrey' where id = 'deirdreBoyer';
update org_people set manager_id = 'andreaWinfrey' where id = 'elizabethGallagher';
update org_people set manager_id = 'andreaWinfrey' where id = 'ginaOBrien';
update org_people set manager_id = 'andreaWinfrey' where id = 'gwendolynBruce';
update org_people set manager_id = 'andreaWinfrey' where id = 'kimberlyPuritz';
update org_people set manager_id = 'andreaWinfrey' where id = 'lindsayOlock';
update org_people set manager_id = 'andreaWinfrey' where id = 'loriSheats';
update org_people set manager_id = 'andreaWinfrey' where id = 'margaretBowers';
update org_people set manager_id = 'andreaWinfrey' where id = 'melbaPhipps';
update org_people set manager_id = 'andreaWinfrey' where id = 'natalieThorndike';
update org_people set manager_id = 'andreaWinfrey' where id = 'neilWelch';
update org_people set manager_id = 'andreaWinfrey' where id = 'patrickDevitt';
update org_people set manager_id = 'andreaWinfrey' where id = 'rebeccaTopper';
update org_people set manager_id = 'andreaWinfrey' where id = 'samanthaAmato';
update org_people set manager_id = 'andreaWinfrey' where id = 'tammyBertazon';
update org_people set manager_id = 'andreaWinfrey' where id = 'tommyStabile';
update org_people set manager_id = 'katharineLochte' where id = 'catherineWaterhouse';
update org_people set manager_id = 'katharineLochte' where id = 'cynthiaKelly';
update org_people set manager_id = 'cynthiaKelly' where id = 'alisonBelt';
update org_people set manager_id = 'alisonBelt' where id = 'johnPanasuk';
update org_people set manager_id = 'alisonBelt' where id = 'rickOldenburg';
update org_people set manager_id = 'alisonBelt' where id = 'meganUrbanski';
update org_people set manager_id = 'katharineLochte' where id = 'davidEsmond';
update org_people set manager_id = 'davidEsmond' where id = 'josephAngelini';
update org_people set manager_id = 'davidEsmond' where id = 'peterStevenson';
update org_people set manager_id = 'davidEsmond' where id = 'nicoleChamberlin';
update org_people set manager_id = 'katharineLochte' where id = 'janiceLynch';
update org_people set manager_id = 'katharineLochte' where id = 'jenniferBerman';
update org_people set manager_id = 'jenniferBerman' where id = 'hayleyPutnam';
update org_people set manager_id = 'hayleyPutnam' where id = 'barbaraBissett';
update org_people set manager_id = 'jenniferBerman' where id = 'leslieHlavach';
update org_people set manager_id = 'katharineLochte' where id = 'lisaDiNenna';
update org_people set manager_id = 'katharineLochte' where id = 'marihaBurkavage';
update org_people set manager_id = 'katharineLochte' where id = 'nicolleMcNulty';
update org_people set manager_id = 'katharineLochte' where id = 'rachelMcIntire';
update org_people set manager_id = 'rachelMcIntire' where id = 'allisonMelocik';
update org_people set manager_id = 'rachelMcIntire' where id = 'mollyManes';
update org_people set manager_id = 'katharineLochte' where id = 'selinaVoelkel';
update org_people set manager_id = 'katharineLochte' where id = 'sherryShilling';
update org_people set manager_id = 'johnKelly' where id = 'katherine';
update org_people set manager_id = 'katherine' where id = 'anilBadruddin';
update org_people set manager_id = 'katherine' where id = 'josephThuman';
update org_people set manager_id = 'josephThuman' where id = 'albertChung';
update org_people set manager_id = 'josephThuman' where id = 'christopherMueller';
update org_people set manager_id = 'josephThuman' where id = 'cowanWallace';
update org_people set manager_id = 'josephThuman' where id = 'erinOrndoff';
update org_people set manager_id = 'josephThuman' where id = 'ikennaAtupulazi';
update org_people set manager_id = 'josephThuman' where id = 'kelseyMcArthur';
update org_people set manager_id = 'josephThuman' where id = 'kimberlyBlevins';
update org_people set manager_id = 'josephThuman' where id = 'lavetteRedding';
update org_people set manager_id = 'josephThuman' where id = 'shadeekaNeville';
update org_people set manager_id = 'josephThuman' where id = 'stephanieNeuman';
update org_people set manager_id = 'josephThuman' where id = 'travisNeville';
update org_people set manager_id = 'josephThuman' where id = 'williamFinch';
update org_people set manager_id = 'katherine' where id = 'rasoul';
update org_people set manager_id = 'katherine' where id = 'samanthaLeal';
update org_people set manager_id = 'katherine' where id = 'thomasBalloch';
update org_people set manager_id = 'thomasBalloch' where id = 'antonioJohnson';
update org_people set manager_id = 'thomasBalloch' where id = 'carlSallese';
update org_people set manager_id = 'carlSallese' where id = 'emilyRopka';
update org_people set manager_id = 'carlSallese' where id = 'sandraBoldman';
update org_people set manager_id = 'carlSallese' where id = 'williamWilkie';
update org_people set manager_id = 'carlSallese' where id = 'williamFilling';
update org_people set manager_id = 'thomasBalloch' where id = 'emmanuelAdetunji';
update org_people set manager_id = 'thomasBalloch' where id = 'rachelWelch';
update org_people set manager_id = 'thomasBalloch' where id = 'robertDoelle';
update org_people set manager_id = 'robertDoelle' where id = 'michaelAdams';
update org_people set manager_id = 'robertDoelle' where id = 'mustafaDarwish';
update org_people set manager_id = 'robertDoelle' where id = 'robertMitchell';
update org_people set manager_id = 'robertDoelle' where id = 'russellWard';
update org_people set manager_id = 'thomasBalloch' where id = 'samuelMello';
update org_people set manager_id = 'samuelMello' where id = 'nasrullahAman';
update org_people set manager_id = 'samuelMello' where id = 'albertLahai';
update org_people set manager_id = 'samuelMello' where id = 'joshuaCooper';
update org_people set manager_id = 'samuelMello' where id = 'rinaldyMentor';
update org_people set manager_id = 'samuelMello' where id = 'sujendraBista';
update org_people set manager_id = 'thomasBalloch' where id = 'shawnCorsello';
update org_people set manager_id = 'katherine' where id = 'williamFancher';
update org_people set manager_id = 'williamFancher' where id = 'atharvaAgrawal';
update org_people set manager_id = 'williamFancher' where id = 'benjaminEpstein';
update org_people set manager_id = 'williamFancher' where id = 'davidWu';
update org_people set manager_id = 'williamFancher' where id = 'kiranMakkapati';
update org_people set manager_id = 'williamFancher' where id = 'lanceJanocha';
update org_people set manager_id = 'williamFancher' where id = 'lukeMacLean';
update org_people set manager_id = 'williamFancher' where id = 'malcolmWhite';
update org_people set manager_id = 'williamFancher' where id = 'nicoleKonstantopoulos';
update org_people set manager_id = 'williamFancher' where id = 'peterSkrzypczak';
update org_people set manager_id = 'williamFancher' where id = 'ruowenWang';
update org_people set manager_id = 'williamFancher' where id = 'sheltonLowery';
update org_people set manager_id = 'williamFancher' where id = 'thanhVan';
update org_people set manager_id = 'johnKelly' where id = 'rodneyWilliams';
update org_people set manager_id = 'johnKelly' where id = 'wes';
update org_people set manager_id = 'wes' where id = 'adamP';
update org_people set manager_id = 'adamP' where id = 'andreaLorenc';
update org_people set manager_id = 'adamP' where id = 'brianGlaser';
update org_people set manager_id = 'adamP' where id = 'carolineBlaumDavis';
update org_people set manager_id = 'adamP' where id = 'davidJohnson';
update org_people set manager_id = 'adamP' where id = 'elizabethMiller';
update org_people set manager_id = 'adamP' where id = 'janetTaylor';
update org_people set manager_id = 'janetTaylor' where id = 'chanelNance';
update org_people set manager_id = 'janetTaylor' where id = 'ethanCarlstrom';
update org_people set manager_id = 'janetTaylor' where id = 'samuelFlick';
update org_people set manager_id = 'janetTaylor' where id = 'stevenAlford';
update org_people set manager_id = 'janetTaylor' where id = 'thomasPaliath';
update org_people set manager_id = 'janetTaylor' where id = 'zacharyTrieb';
update org_people set manager_id = 'adamP' where id = 'jenniSoumah';
update org_people set manager_id = 'jenniSoumah' where id = 'florenceCronan';
update org_people set manager_id = 'jenniSoumah' where id = 'hollyCorsello';
update org_people set manager_id = 'hollyCorsello' where id = 'angelaMoore';
update org_people set manager_id = 'hollyCorsello' where id = 'constanceParker';
update org_people set manager_id = 'hollyCorsello' where id = 'deniseMattias';
update org_people set manager_id = 'hollyCorsello' where id = 'jessicaMantegna';
update org_people set manager_id = 'hollyCorsello' where id = 'krystalynneCortez';
update org_people set manager_id = 'hollyCorsello' where id = 'mckaylaMartin';
update org_people set manager_id = 'hollyCorsello' where id = 'reginaFinck';
update org_people set manager_id = 'hollyCorsello' where id = 'tammyHoltman';
update org_people set manager_id = 'hollyCorsello' where id = 'tylerDover';
update org_people set manager_id = 'hollyCorsello' where id = 'violetLee';
update org_people set manager_id = 'jenniSoumah' where id = 'jenniferKnauff';
update org_people set manager_id = 'jenniSoumah' where id = 'joshuaMace';
update org_people set manager_id = 'jenniSoumah' where id = 'kaseyKappler';
update org_people set manager_id = 'jenniSoumah' where id = 'katlynBaer';
update org_people set manager_id = 'jenniSoumah' where id = 'shawntriceFerguson';
update org_people set manager_id = 'jenniSoumah' where id = 'shenitaErvin';
update org_people set manager_id = 'adamP' where id = 'katieRobinson';
update org_people set manager_id = 'katieRobinson' where id = 'alexanderRoche';
update org_people set manager_id = 'katieRobinson' where id = 'emilyKeever';
update org_people set manager_id = 'katieRobinson' where id = 'evanWolfsonStofko';
update org_people set manager_id = 'katieRobinson' where id = 'kaseyPhelan';
update org_people set manager_id = 'katieRobinson' where id = 'kevinSchnitker';
update org_people set manager_id = 'katieRobinson' where id = 'kierraRadcliffe';
update org_people set manager_id = 'katieRobinson' where id = 'shannonGoscinski';
update org_people set manager_id = 'katieRobinson' where id = 'staceyRacine';
update org_people set manager_id = 'katieRobinson' where id = 'traceyWilliams';
update org_people set manager_id = 'adamP' where id = 'kimberlyFunk';
update org_people set manager_id = 'adamP' where id = 'leahDeGross';
update org_people set manager_id = 'adamP' where id = 'madelaineSomarriba';
update org_people set manager_id = 'adamP' where id = 'phyllisOstendorf';
update org_people set manager_id = 'adamP' where id = 'saraRuffner';
update org_people set manager_id = 'adamP' where id = 'stacyMcCue';
update org_people set manager_id = 'adamP' where id = 'whitneyMcMillian';
update org_people set manager_id = 'wes' where id = 'frankieIV';
update org_people set manager_id = 'frankieIV' where id = 'benjaminMayer';
update org_people set manager_id = 'frankieIV' where id = 'joannaMarinopoulos';
update org_people set manager_id = 'frankieIV' where id = 'matthewCrowner';
update org_people set manager_id = 'matthewCrowner' where id = 'daphneLeedy';
update org_people set manager_id = 'matthewCrowner' where id = 'ericaGageby';
update org_people set manager_id = 'ericaGageby' where id = 'ianBurrough';
update org_people set manager_id = 'matthewCrowner' where id = 'lukeBurrough';
update org_people set manager_id = 'matthewCrowner' where id = 'melissaLemaster';
update org_people set manager_id = 'matthewCrowner' where id = 'rebeccaSnyder';
update org_people set manager_id = 'matthewCrowner' where id = 'tinaNichols';
update org_people set manager_id = 'frankieIV' where id = 'stevenPyzik';
update org_people set manager_id = 'stevenPyzik' where id = 'amberManekia';
update org_people set manager_id = 'amberManekia' where id = 'abigailBreschi';
update org_people set manager_id = 'amberManekia' where id = 'alondreaWilliams';
update org_people set manager_id = 'amberManekia' where id = 'deloraLaroccoSchavier';
update org_people set manager_id = 'amberManekia' where id = 'jamarDowdye';
update org_people set manager_id = 'amberManekia' where id = 'jordanMiles';
update org_people set manager_id = 'amberManekia' where id = 'lauraHalsey';
update org_people set manager_id = 'amberManekia' where id = 'laurenGiblin';
update org_people set manager_id = 'amberManekia' where id = 'madisonVanik';
update org_people set manager_id = 'amberManekia' where id = 'michaelVonRinteln';
update org_people set manager_id = 'amberManekia' where id = 'paulLeary';
update org_people set manager_id = 'stevenPyzik' where id = 'elizabethCramer';
update org_people set manager_id = 'elizabethCramer' where id = 'allisonVolcy';
update org_people set manager_id = 'elizabethCramer' where id = 'carlaLangley';
update org_people set manager_id = 'elizabethCramer' where id = 'gloriaMeredith';
update org_people set manager_id = 'elizabethCramer' where id = 'grantNewcome';
update org_people set manager_id = 'elizabethCramer' where id = 'jaeChong';
update org_people set manager_id = 'elizabethCramer' where id = 'leontyneBurbridge';
update org_people set manager_id = 'elizabethCramer' where id = 'leslieBrown';
update org_people set manager_id = 'elizabethCramer' where id = 'nevaehWilliams';
update org_people set manager_id = 'elizabethCramer' where id = 'tatiaBell';
update org_people set manager_id = 'elizabethCramer' where id = 'tyreeseNeal';
update org_people set manager_id = 'stevenPyzik' where id = 'heatherWilliams';
update org_people set manager_id = 'stevenPyzik' where id = 'heribertoFauth';
update org_people set manager_id = 'stevenPyzik' where id = 'jamesMackintosh';
update org_people set manager_id = 'jamesMackintosh' where id = 'christieCarlton';
update org_people set manager_id = 'jamesMackintosh' where id = 'danielleNaumann';
update org_people set manager_id = 'jamesMackintosh' where id = 'rickySchafer';
update org_people set manager_id = 'rickySchafer' where id = 'christinaKirby';
update org_people set manager_id = 'rickySchafer' where id = 'danielleBinnie';
update org_people set manager_id = 'rickySchafer' where id = 'hannahYoung';
update org_people set manager_id = 'rickySchafer' where id = 'jadeReall';
update org_people set manager_id = 'rickySchafer' where id = 'jamesDorseyIII';
update org_people set manager_id = 'rickySchafer' where id = 'juliannaSchaeffer';
update org_people set manager_id = 'rickySchafer' where id = 'julieFox';
update org_people set manager_id = 'rickySchafer' where id = 'kimberlyHunter';
update org_people set manager_id = 'rickySchafer' where id = 'oliviaFinch';
update org_people set manager_id = 'jamesMackintosh' where id = 'robinVanik';
update org_people set manager_id = 'robinVanik' where id = 'amyParsley';
update org_people set manager_id = 'robinVanik' where id = 'christinaMobley';
update org_people set manager_id = 'robinVanik' where id = 'christineHollenack';
update org_people set manager_id = 'robinVanik' where id = 'dannyDaneker';
update org_people set manager_id = 'robinVanik' where id = 'joyWiegand';
update org_people set manager_id = 'robinVanik' where id = 'karenMatthews';
update org_people set manager_id = 'robinVanik' where id = 'katieVia';
update org_people set manager_id = 'robinVanik' where id = 'mandyKessler';
update org_people set manager_id = 'robinVanik' where id = 'markBrennan';
update org_people set manager_id = 'robinVanik' where id = 'samanthaLudwig';
update org_people set manager_id = 'robinVanik' where id = 'saraDougherty';
update org_people set manager_id = 'robinVanik' where id = 'valerieGaugler';
update org_people set manager_id = 'robinVanik' where id = 'valerieLewis';
update org_people set manager_id = 'robinVanik' where id = 'willisiaSmith';
update org_people set manager_id = 'stevenPyzik' where id = 'jessicaEdwards';
update org_people set manager_id = 'stevenPyzik' where id = 'kellyKernan';
update org_people set manager_id = 'kellyKernan' where id = 'alejandraBentley';
update org_people set manager_id = 'kellyKernan' where id = 'courtneyLecates';
update org_people set manager_id = 'kellyKernan' where id = 'georgiaFrangos';
update org_people set manager_id = 'kellyKernan' where id = 'hannahIngham';
update org_people set manager_id = 'kellyKernan' where id = 'jacondaBrown';
update org_people set manager_id = 'kellyKernan' where id = 'kellyCarlstrom';
update org_people set manager_id = 'kellyKernan' where id = 'kimberlyKotwica';
update org_people set manager_id = 'kimberlyKotwica' where id = 'amieErline';
update org_people set manager_id = 'kimberlyKotwica' where id = 'brechinVail';
update org_people set manager_id = 'kimberlyKotwica' where id = 'dakotaCrabtree';
update org_people set manager_id = 'kimberlyKotwica' where id = 'debraLynnSigai';
update org_people set manager_id = 'kimberlyKotwica' where id = 'elizabethReid';
update org_people set manager_id = 'kimberlyKotwica' where id = 'justinaMoses';
update org_people set manager_id = 'kimberlyKotwica' where id = 'kaliopiAvgerinos';
update org_people set manager_id = 'kimberlyKotwica' where id = 'magnoliaKoutelis';
update org_people set manager_id = 'kimberlyKotwica' where id = 'susanSommerfeld';
update org_people set manager_id = 'kellyKernan' where id = 'laurenLong';
update org_people set manager_id = 'kellyKernan' where id = 'shannonWilson';
update org_people set manager_id = 'shannonWilson' where id = 'adamChaney';
update org_people set manager_id = 'shannonWilson' where id = 'ashleyBarber';
update org_people set manager_id = 'shannonWilson' where id = 'brittanyDriscoll';
update org_people set manager_id = 'shannonWilson' where id = 'demetriaGaines';
update org_people set manager_id = 'shannonWilson' where id = 'jessicaGreene';
update org_people set manager_id = 'shannonWilson' where id = 'kimberlyWhite';
update org_people set manager_id = 'shannonWilson' where id = 'lishaIacovelli';
update org_people set manager_id = 'shannonWilson' where id = 'shannonStein';
update org_people set manager_id = 'shannonWilson' where id = 'suzanneThomas';
update org_people set manager_id = 'kellyKernan' where id = 'sondaFleming';
update org_people set manager_id = 'kellyKernan' where id = 'taishaLawrence';
update org_people set manager_id = 'kellyKernan' where id = 'trinityGarcia';
update org_people set manager_id = 'stevenPyzik' where id = 'maryWillard';
update org_people set manager_id = 'maryWillard' where id = 'andreaRijos';
update org_people set manager_id = 'maryWillard' where id = 'daShaeThomas';
update org_people set manager_id = 'maryWillard' where id = 'danielleHimes';
update org_people set manager_id = 'maryWillard' where id = 'johnLanahan';
update org_people set manager_id = 'maryWillard' where id = 'lamontDarden';
update org_people set manager_id = 'maryWillard' where id = 'laurieMartin';
update org_people set manager_id = 'maryWillard' where id = 'mahaliaHarrison';
update org_people set manager_id = 'maryWillard' where id = 'paulineCox';
update org_people set manager_id = 'maryWillard' where id = 'taylorJonesLee';
update org_people set manager_id = 'maryWillard' where id = 'treneFuller';
update org_people set manager_id = 'stevenPyzik' where id = 'taraGaskins';
update org_people set manager_id = 'frankieIV' where id = 'williamCarlton';
update org_people set manager_id = 'wes' where id = 'amyGlorioso';
update org_people set manager_id = 'wes' where id = 'anupamaAkunuri';
update org_people set manager_id = 'wes' where id = 'julieLanahan';
update org_people set manager_id = 'wes' where id = 'lucySchultz';
update org_people set manager_id = 'lucySchultz' where id = 'richardHarrison';
update org_people set manager_id = 'wes' where id = 'michaelBatley';
update org_people set manager_id = 'wes' where id = 'michaelCaralle';
update org_people set manager_id = 'wes' where id = 'sandra';
update org_people set manager_id = 'sandra' where id = 'christinaFrank';
update org_people set manager_id = 'sandra' where id = 'jenniferCohen';
update org_people set manager_id = 'sandra' where id = 'marcyGrenier';
update org_people set manager_id = 'sandra' where id = 'markGoscinski';
update org_people set manager_id = 'sandra' where id = 'sandyFalsis';
update org_people set manager_id = 'sandyFalsis' where id = 'cherieGreen';
update org_people set manager_id = 'cherieGreen' where id = 'caseyKongsted';
update org_people set manager_id = 'cherieGreen' where id = 'collinMeredith';
update org_people set manager_id = 'sandyFalsis' where id = 'aprilRamsey';
update org_people set manager_id = 'sandyFalsis' where id = 'carrieDuffy';
update org_people set manager_id = 'sandyFalsis' where id = 'laceyGoff';
update org_people set manager_id = 'sandyFalsis' where id = 'riemanJenkins';
update org_people set manager_id = 'sandyFalsis' where id = 'samuelNorris';
update org_people set manager_id = 'sandyFalsis' where id = 'williamPinkine';
update org_people set manager_id = 'sandra' where id = 'timothyWorkman';
update org_people set manager_id = 'sandra' where id = 'timothyJones';
update org_people set manager_id = 'sandra' where id = 'zacharyShalit';
update org_people set manager_id = 'wes' where id = 'stephenK';
update org_people set manager_id = 'stephenK' where id = 'christieOpitz';
update org_people set manager_id = 'stephenK' where id = 'kariOldenburg';
update org_people set manager_id = 'stephenK' where id = 'kathleenGier';
update org_people set manager_id = 'stephenK' where id = 'kellyWilson';
update org_people set manager_id = 'stephenK' where id = 'micheleSargent';
update org_people set manager_id = 'stephenK' where id = 'michelleBirth';
update org_people set manager_id = 'stephenK' where id = 'sherriMartak';
update org_people set manager_id = 'stephenK' where id = 'whitneyEllis';
update org_people set manager_id = 'danyellAmos' where id = 'alisshaRoden';
update org_people set manager_id = 'danyellAmos' where id = 'amandaCollierNystrom';
update org_people set manager_id = 'danyellAmos' where id = 'belindaAdams';
update org_people set manager_id = 'danyellAmos' where id = 'crystalWalker';
update org_people set manager_id = 'danyellAmos' where id = 'deannaHollar';
update org_people set manager_id = 'danyellAmos' where id = 'ericaJohnson';
update org_people set manager_id = 'danyellAmos' where id = 'lutieLink';
update org_people set manager_id = 'danyellAmos' where id = 'meganSallese';
update org_people set manager_id = 'danyellAmos' where id = 'samanthaWebb';
update org_people set manager_id = 'danyellAmos' where id = 'savannahHarris';
update org_people set manager_id = 'danyellAmos' where id = 'sonyaMeilhammer';
update org_people set manager_id = 'danyellAmos' where id = 'tammyleeGodwin';
update org_people set manager_id = 'danyellAmos' where id = 'kathleenCampbell';
update org_people set manager_id = 'heatherMiller' where id = 'adrianaCollier';
update org_people set manager_id = 'heatherMiller' where id = 'amyEisemann';
update org_people set manager_id = 'heatherMiller' where id = 'ashleyPrice';
update org_people set manager_id = 'heatherMiller' where id = 'baileyVia';
update org_people set manager_id = 'heatherMiller' where id = 'carrieGonzalez';
update org_people set manager_id = 'heatherMiller' where id = 'christineMills';
update org_people set manager_id = 'heatherMiller' where id = 'erikaOkehie';
update org_people set manager_id = 'heatherMiller' where id = 'galeCarlton';
update org_people set manager_id = 'heatherMiller' where id = 'jenniferThuman';
update org_people set manager_id = 'heatherMiller' where id = 'katherineDietz';
update org_people set manager_id = 'heatherMiller' where id = 'margaretFrench';
update org_people set manager_id = 'heatherMiller' where id = 'richardFlores';
update org_people set manager_id = 'heatherMiller' where id = 'riverMartinezBarton';
update org_people set manager_id = 'heatherMiller' where id = 'shauntayParrish';
update org_people set manager_id = 'vanessaWaltman' where id = 'elizabethRatchford';
update org_people set manager_id = 'vanessaWaltman' where id = 'helanaAmos';
update org_people set manager_id = 'vanessaWaltman' where id = 'kathrynBenson';
update org_people set manager_id = 'vanessaWaltman' where id = 'kourtneyBrown';
update org_people set manager_id = 'vanessaWaltman' where id = 'shaneklaFrazier';
update org_people set manager_id = 'vanessaWaltman' where id = 'stephenWaldron';
update org_people set manager_id = 'vanessaWaltman' where id = 'kellyStafford';
update org_people set manager_id = 'adamGordy' where id = 'jordanWiegand';
update org_people set manager_id = 'adamGordy' where id = 'zacharySpivey';
update org_people set manager_id = 'adamGordy' where id = 'marcusCarroll';
update org_people set manager_id = 'carolineSavin' where id = 'angelaMcGraw';
update org_people set manager_id = 'carolineSavin' where id = 'patrickKavanagh';
update org_people set manager_id = 'carolineSavin' where id = 'stevenVannoy';

-- ============ VERIFICATION ============
-- Expected: total_people=464, manager_known=442, manager_null=22, titles=8
select
  (select count(*) from org_people) as total_people,
  (select count(*) from org_people where manager_id is not null) as manager_known,
  (select count(*) from org_people where manager_id is null) as manager_null,
  (select count(*) from org_titles) as titles;
