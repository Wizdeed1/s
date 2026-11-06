# Graph Report - s  (2026-11-06)

## Corpus Check
- 144 files · ~458,310 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 26 file(s) not represented in the graph (top: .css 22, (none) 3, .woff2 1)

## Summary
- 2606 nodes · 5347 edges · 133 communities (124 shown, 9 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 399 edges (avg confidence: 0.86)
- Token cost: 396,768 input · 0 output

## Community Hubs (Navigation)
- Results and Month Pages
- Find Search Answers
- WFM Daily Review Report
- Team Page and Forms
- Objections and Today
- Senior Month Close Emails
- KPI Rules Editor
- System Names Matching
- Build Import and KPI Model
- Report Engine Parsers
- Quality EVAL Import
- Recogniser Unit Tests
- Shell Navigation and Periods
- GSAP Library Internals A
- Report Builder Actions
- Weekly Commercial Page
- Stakeholder Deck Builder
- Corrections After Review
- Distribution List Import
- Reconcile Old Excel
- Agent Page and Follow-ups
- Workbook Build and Save
- Uploads Library
- Deduction and Incentive Emails
- WFM Team Workspace
- Checks and Import Log
- Performance Review Page
- Rules Property Tests
- Daily Email Rendering
- CT Workbook Tests
- Report Builder Boot
- WFM Dashboard
- File Recogniser Panel
- Corrections Parser Tests
- Brand Email Fill
- Daily Data Storage
- Roster and People Cards
- Council Session Verdicts
- Smart-Link and Corrections Tests
- Brand Report Panels
- Weekly Model Tests
- History Import
- Build Steps and Export
- Shared Save Queue
- Uploads and Agent Tests
- Report Builder Rebuild
- Incentive Email Tests
- Interactions Page
- Motion and Animation
- Notes and Merge Fixes
- Counting and Tenure Tests
- Daily History Tests
- Recognise and EVAL Tests
- XSS Injection Checks
- Shared Folder Trust Model
- Translations i18n
- Deck Artwork Helpers
- Standalone HTML Assembly
- CI and Supply Chain
- Smoke and Sign-in Tests
- Security Review Skill
- Data Backup Export
- MC Leaders Report Data
- Agent History View
- Design System and Fonts
- Performance Deck Tests
- Attendance Template Tests
- Core Unit Tests
- GSAP Library Internals B
- Python Build Scripts
- Attendance Templates Page
- Performance Review Tests
- Excel XLS Readers
- Data Loading and Start
- Quality Page Tests
- Data Folder Tests
- Smart-Link Workbook Tests
- Person Performance Panel
- Synthetic Export Generator
- Reconcile Unit Tests
- Weekly Page Tests
- GSAP Library Internals C
- Attendance Corrections Store
- Report Builder Preferences
- Department Scorecard Tests
- One-page Form Tests
- Supply Chain Tests
- GSAP Tween Core
- GSAP Library Internals D
- Title Case Captions
- Vacation Cover
- Build Workflow Docs
- No-schedule Tests
- Attendance Flow Tests
- Old Workbook Fixtures
- Screenshot Tests
- Deck Screenshot Script
- Live Scoring Inputs
- Report Builder Publishing
- Motion Tests
- Reconcile Browser Tests
- Theme Tests
- Document Generation Tests
- Leaders Email Render
- Start Guard Boot
- Folder Tests
- Overlay Tests
- WFM Team Tests
- GSAP Library Internals E
- Agent Page Publishing
- Incentive Base Pay
- Brand History Import
- Appearance Theme Setting
- Accounts Tests
- Caption Case Tests
- Peek Preview Tests
- v33 Reference Extras
- Daily Brand Seed Data
- Corrections Applied to Month
- File Recognition Core
- Build Flow Tests
- Presentation Decks
- Recogniser Test Data
- GSAP Library Internals F
- GSAP Library Internals G
- Busy Indicator
- Deck Build Script
- Attendance Module
- Forms Module
- Glue Module
- KPI Module
- Name Linking Module
- v33 KPI Reference

## God Nodes (most connected - your core abstractions)
1. `refresh()` - 29 edges
2. `toast()` - 29 edges
3. `exportWs()` - 27 edges
4. `render()` - 26 edges
5. `renderResults()` - 23 edges
6. `rbRebuild()` - 23 edges
7. `queueWrite()` - 23 edges
8. `renderTeam()` - 20 edges
9. `dmRender()` - 19 edges
10. `render()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `esc() (start guard)` --semantically_similar_to--> `esc()`  [INFERRED] [semantically similar]
  js/head_boot.html → dt/render.js
- `Injection into the page check (OWASP A03, CWE-79)` --references--> `esc()`  [INFERRED]
  .claude/skills/mc-security-review/SKILL.md → dt/leaders.js
- `Injection into the page check (OWASP A03, CWE-79)` --references--> `esc()`  [INFERRED]
  .claude/skills/mc-security-review/SKILL.md → dt/render.js
- `Injection into the page check (OWASP A03, CWE-79)` --references--> `esc()`  [INFERRED]
  .claude/skills/mc-security-review/SKILL.md → dt/wfm.js
- `autoGrants (trust on first key)` --references--> `Auth`  [INFERRED]
  .claude/skills/mc-security-review/SKILL.md → js/auth.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Synthetic-data-only policy (council condition, security evidence contract, privacy rules, test suite)** — council_sessions_2026_10_19_mc_report_builder_internal_synthetic_data_rule, claude_skills_mc_security_review_skill_evidence_contract, claude_skills_mc_security_review_skill_privacy_check, readme_test_suite [INFERRED 0.85]
- **Page head boot sequence assembled by make_head.py (CSP first, theme before first paint, start guard on the sign-in card)** — js_make_head, js_csp_boot, js_theme_boot, js_head_boot, js_ui3_body_lock_dialog [INFERRED 0.95]
- **Offline guarantee: everything inline, nothing over the network** — js_csp_boot, claude_skills_mc_security_review_skill_no_network_check, readme_no_send_principle, vendor_readme_gsap, tools_fontsrc_geist_ofl_geist_font, test_supply [INFERRED 0.85]

## Communities (133 total, 9 thin omitted)

### Community 0 - "Results and Month Pages"
Cohesion: 0.05
Nodes (108): Auth, addModelDaily(), addModelKpi(), adhSheet(), adjustResult(), adOf(), agentCols(), agentRow() (+100 more)

### Community 1 - "Find Search Answers"
Cohesion: 0.08
Nodes (71): F_AR_MON, F_BRANDM, F_BRANDS, F_CORE, F_DBRAND, F_INTER, F_KW, F_MONRE (+63 more)

### Community 2 - "WFM Daily Review Report"
Cohesion: 0.08
Nodes (64): RFC-4180, addQueue(), addTable(), b64(), band(), brandOfTable(), build(), buildEml() (+56 more)

### Community 3 - "Team Page and Forms"
Cohesion: 0.06
Nodes (60): fuChip(), AGENT_TXT, agentHasAccount(), ATT_CLS(), ATT_SHORT(), attGridHtml(), cardOfRow(), closeAttPop() (+52 more)

### Community 4 - "Objections and Today"
Cohesion: 0.07
Nodes (56): ATT_WANT, attWord(), attWordEn(), meObjHtml(), OBJ_FIXER, OBJ_KIND_SHORT, OBJ_KINDS, OBJ_ST (+48 more)

### Community 5 - "Senior Month Close Emails"
Cohesion: 0.06
Nodes (48): CAL_STEPS, calAuto(), calDays(), calDaysHtml(), calDue(), calMark(), calSteps(), closeMonthNow() (+40 more)

### Community 6 - "KPI Rules Editor"
Cohesion: 0.08
Nodes (58): allTeamCards(), andList(), canRules(), CNT_EDGE, CNT_LBL, CNT_MISSING, CNT_MONEY, cntEarned() (+50 more)

### Community 7 - "System Names Matching"
Cohesion: 0.08
Nodes (51): afterSysEdit(), akaOf(), akaWith(), applySysMatches(), askSysNames(), combineApply(), combinePlan(), combineUndo() (+43 more)

### Community 8 - "Build Import and KPI Model"
Cohesion: 0.06
Nodes (45): attachmentBytes(), cardKeyOf(), computeIssues(), computeKpi(), computeNotes(), dedMailData(), figKpis(), fixLabel() (+37 more)

### Community 9 - "Report Engine Parsers"
Cohesion: 0.07
Nodes (35): addDays(), averageRow(), brandFromQueues(), classify(), dateRange(), dayDiff(), dur(), excelDate() (+27 more)

### Community 10 - "Quality EVAL Import"
Cohesion: 0.11
Nodes (42): canQuality(), csatBoxHtml(), csatTeams(), evalTemplate(), exportQuality(), importEval(), LEADER_ITEMS, linkPeople() (+34 more)

### Community 11 - "Recogniser Unit Tests"
Cohesion: 0.05
Nodes (36): ADH, agents, assert, ATT, BOOK1, CALLS, CODES, Core (+28 more)

### Community 12 - "Shell Navigation and Periods"
Cohesion: 0.09
Nodes (32): applyRail(), closeMenus(), dailyKs(), DEPT, lsGet3(), moreHtml(), moreOpen(), mqLaptop (+24 more)

### Community 13 - "GSAP Library Internals A"
Cohesion: 0.06
Nodes (18): ia(), ja(), Lc(), Md(), Nc(), Nd(), oa(), Od() (+10 more)

### Community 14 - "Report Builder Actions"
Cohesion: 0.08
Nodes (36): DH_LISTS, DH_PARTS, dhCompare(), dhPut(), dhRead(), dhSame(), dhSeedOf(), dmHistExport() (+28 more)

### Community 15 - "Weekly Commercial Page"
Cohesion: 0.11
Nodes (38): canWeekly(), DECK_LOGOS, deckLogosOk(), outagesNow(), renderWeeklyWs(), WC, WC0, WC_BRAND (+30 more)

### Community 16 - "Stakeholder Deck Builder"
Cohesion: 0.08
Nodes (30): WcDeck, A(), ALT, anim(), [artDir, outFile], C, chip(), Core (+22 more)

### Community 17 - "Corrections After Review"
Cohesion: 0.09
Nodes (29): AttTpl, canUpd(), renderUpd(), updAfter(), updApply(), updCtx(), updFiles(), updLabelNow() (+21 more)

### Community 18 - "Distribution List Import"
Cohesion: 0.08
Nodes (26): attitudeRe(), attPubT, BASES0, CONTACTS0, distributionPairs(), distScore(), ELIG, eligFrom() (+18 more)

### Community 19 - "Reconcile Old Excel"
Cohesion: 0.13
Nodes (31): cmpCardHtml(), cmpFile(), cmpFiles(), cmpPicker, exportCmp(), RC_CAUSE, RC_MEAS, rcAbsRows() (+23 more)

### Community 20 - "Agent Page and Follow-ups"
Cohesion: 0.10
Nodes (24): formReadHtml(), loadAgentData(), meFormsReady(), meFormWhere(), meSigState(), openSign(), renderAll(), renderMe() (+16 more)

### Community 21 - "Workbook Build and Save"
Cohesion: 0.11
Nodes (30): agentOf(), attSA(), buildInc(), downloadForm(), exportAgentHistory(), exportDailyAdh(), exportDailyAdhAll(), exportHistory() (+22 more)

### Community 22 - "Uploads Library"
Cohesion: 0.17
Nodes (29): IDBS, renderRepCard(), renderUploads(), REP, repKeep(), repLoad(), UP, upAfterDrop() (+21 more)

### Community 23 - "Deduction and Incentive Emails"
Cohesion: 0.11
Nodes (29): absScopeOk(), cardBand(), cardGrid(), cardMail(), cardTable(), curMail(), dedDiff(), incData() (+21 more)

### Community 24 - "WFM Team Workspace"
Cohesion: 0.12
Nodes (24): WFM team header, tabs and workspace (#wfmHead, #v-wfm), AG_SETS, AGC, agentRowsWs(), canWfmMail(), exportAgents(), MAIL_HOSTS, mailHome (+16 more)

### Community 25 - "Checks and Import Log"
Cohesion: 0.12
Nodes (21): askBuild(), askFinalize(), checkNotes(), checkRowHtml(), CHK_GROUPS, chkWhy(), closeDlg(), hhmm() (+13 more)

### Community 26 - "Performance Review Page"
Cohesion: 0.20
Nodes (25): callDaysOk(), canPerf(), PR, PR_NAMES, prBase(), prBaseText(), prCallsChange(), prDateNow() (+17 more)

### Community 27 - "Rules Property Tests"
Cohesion: 0.09
Nodes (21): assert, card55, card60, Core, fs, Kpi, Old, path (+13 more)

### Community 28 - "Daily Email Rendering"
Cohesion: 0.21
Nodes (24): barRows(), cell(), d(), dayLabel(), dayName(), dayShort(), dayWords(), dmy() (+16 more)

### Community 29 - "CT Workbook Tests"
Cohesion: 0.09
Nodes (18): ctBook(), path, assert, Att, Core, { ctBook }, Kpi, path (+10 more)

### Community 30 - "Report Builder Boot"
Cohesion: 0.14
Nodes (24): rbAddFiles(), rbBoot(), rbCombine(), rbComposeBag(), rbDateRender(), rbDayLabel(), rbE(), rbEmptyBag() (+16 more)

### Community 31 - "WFM Dashboard"
Cohesion: 0.17
Nodes (22): calMine(), BRAND_C, DASH_ACTS, DASH_KPIS, DASH_METRICS, dashAgg(), dashAttention(), dashChange() (+14 more)

### Community 32 - "File Recogniser Panel"
Cohesion: 0.17
Nodes (19): loadRecogLearned(), RC_LEVEL, RC_ROUTE, rcMonthOf(), recogCardHtml(), recogDaily(), recogFiles(), recogForget() (+11 more)

### Community 33 - "Corrections Parser Tests"
Cohesion: 0.09
Nodes (18): ctx, days(), eml, HX, { JSDOM }, loose, LX, MX (+10 more)

### Community 34 - "Brand Email Fill"
Cohesion: 0.35
Nodes (21): adaptColumns(), allTables(), blocks(), bodyOf(), classifyRows(), divsIn(), dropColumn(), fillRow() (+13 more)

### Community 35 - "Daily Data Storage"
Cohesion: 0.14
Nodes (15): canDailyMail(), canDailySave(), canDailyTool(), cleanDay(), dailyLoading, dailyMonth(), dailyMonths(), dailyToMonth() (+7 more)

### Community 36 - "Roster and People Cards"
Cohesion: 0.11
Nodes (22): badgesCell(), ecardHtml(), employeesHtml(), emptyCard(), filtered(), renderIssues(), renderPeople(), renderPeopleCards() (+14 more)

### Community 37 - "Council Session Verdicts"
Cohesion: 0.22
Nodes (15): Council memory (council.md), Council session 2026-10-19: MC Report Builder (internal), Calculation engine (deductions and incentives), CIS Microsoft Edge Benchmark v4.0.0, item 1.4.6, Saudi Electronic Transactions Law (signature validity), File System Access API (Chromium-based Edge), Genesys Cloud WEM, NCA Essential Cybersecurity Controls (ECC 2-2-3-3, 2-12) (+7 more)

### Community 38 - "Smart-Link and Corrections Tests"
Cohesion: 0.10
Nodes (14): Core, normTeam(), { chromium }, fixture, fs, [page0, out = 'test/shots'], path, { chromium } (+6 more)

### Community 39 - "Brand Report Panels"
Cohesion: 0.17
Nodes (21): dmCtx(), dmDays(), dmFieldIn(), dmRefresh(), dmRender(), dmUnsent(), rbBrandBuild(), rbField() (+13 more)

### Community 40 - "Weekly Model Tests"
Cohesion: 0.11
Nodes (17): calls, Core, dmy(), fs, H, oct(), outages, pad() (+9 more)

### Community 41 - "History Import"
Cohesion: 0.14
Nodes (20): addFiles(), addHistoryFile(), addHistoryFiles(), applyGenesysHistory(), effRoster(), getWorker(), ghistText(), importRosterFile() (+12 more)

### Community 42 - "Build Steps and Export"
Cohesion: 0.18
Nodes (20): animIn(), build(), buildBlocker(), canBuild(), chips(), commitActive(), fillSettings(), hidePop() (+12 more)

### Community 43 - "Shared Save Queue"
Cohesion: 0.13
Nodes (20): clone(), dropHistory(), formDefaults(), limited(), openForm(), persistAtt(), persistCards(), persistLinks() (+12 more)

### Community 44 - "Uploads and Agent Tests"
Cohesion: 0.11
Nodes (14): args, files, fs, names, { chromium }, fixture, fs, [page0, out] (+6 more)

### Community 45 - "Report Builder Rebuild"
Cohesion: 0.23
Nodes (19): dmHistAsa(), rbAutoSave(), rbB(), rbBagDays(), rbClean(), rbClone(), rbGenesysBag(), rbGet() (+11 more)

### Community 46 - "Incentive Email Tests"
Cohesion: 0.11
Nodes (13): Incentive email (Supervisors › Incentive email), { chromium }, exp, fixture, fs, out, page0, path (+5 more)

### Community 47 - "Interactions Page"
Cohesion: 0.18
Nodes (15): canInter(), ERR_NAME(), exportInter(), importInteractions(), interAgg(), interLinkMemo, interLinks(), interLoading (+7 more)

### Community 48 - "Motion and Animation"
Cohesion: 0.17
Nodes (15): barsAt, clamp(), countFmt(), countParts(), countUp(), fillBars(), gsapOk(), introKey() (+7 more)

### Community 49 - "Notes and Merge Fixes"
Cohesion: 0.14
Nodes (18): addPerson(), applyIdFills(), applyMerge(), attachReview(), autoLinkNames(), closeDrawer(), commitSup(), computeModel() (+10 more)

### Community 50 - "Counting and Tenure Tests"
Cohesion: 0.11
Nodes (13): How this was counted drawer (#dHow), { chromium }, fixture, fs, out, page0, path, { chromium } (+5 more)

### Community 51 - "Daily History Tests"
Cohesion: 0.12
Nodes (15): BRANDS, { chromium }, file, fileP, fs, have, html, months (+7 more)

### Community 52 - "Recognise and EVAL Tests"
Cohesion: 0.12
Nodes (15): CT, evalBook(), MAIN, path, SM2, Writer2, { chromium }, { evalBook } (+7 more)

### Community 53 - "XSS Injection Checks"
Cohesion: 0.12
Nodes (10): Sandboxed email preview iframe (#mailFrame), { chromium }, exp, fixture, fs, os, out, page0 (+2 more)

### Community 54 - "Shared Folder Trust Model"
Cohesion: 0.16
Nodes (10): Manage accounts drawer (#dAccounts), Tool roles (Admin, WFM analyst, WFM manager, Senior manager, Supervisor, Quality team, Agent, Waiting for access), Manage accounts, MC Data shared folder, Browser test suite (synthetic people), { chromium }, fs, html (+2 more)

### Community 55 - "Translations i18n"
Cohesion: 0.19
Nodes (14): agoT(), AR, AR_DAY, AR_MON, dayNameT(), fmtDateT(), fmtDueT(), langApply() (+6 more)

### Community 56 - "Deck Artwork Helpers"
Cohesion: 0.14
Nodes (13): body, { chromium }, COLORS, EXTRA, fs, ICONS, img(), path (+5 more)

### Community 57 - "Standalone HTML Assembly"
Cohesion: 0.17
Nodes (10): assemble3.sh script, assemble_standalone.sh script, brand_src.html (#brand-assets JSON), csp_boot.html (#cspBoot no-network Content-Security-Policy), head_boot.html (start guard), ui3_body.html (app body markup), Workspace sidebar (#sidebar, #wsSeg), renderBrand() (+2 more)

### Community 58 - "CI and Supply Chain"
Cohesion: 0.17
Nodes (13): Node.js CI workflow (node.js.yml), actions/checkout@v4, actions/setup-node@v4, CI build job (Node 18.x / 20.x / 22.x matrix), description, license, name, private (+5 more)

### Community 59 - "Smoke and Sign-in Tests"
Cohesion: 0.12
Nodes (11): { chromium }, fixture, fs, [page0, out = 'test/shots'], path, { chromium }, fs, [page0, out] (+3 more)

### Community 60 - "Security Review Skill"
Cohesion: 0.20
Nodes (6): mc-security-review skill (SKILL.md), Claude Code Cybersecurity Skills (Riyan Pratama / Masriyan, MIT), Team data key, FolderStore, b64(), emlFile()

### Community 61 - "Data Backup Export"
Cohesion: 0.27
Nodes (13): BK_FILES, BK_SKIP, bkB64(), bkExport(), bkImport(), bkKey(), bkOpen(), bkPipe() (+5 more)

### Community 62 - "MC Leaders Report Data"
Cohesion: 0.21
Nodes (9): buildReport(), computeData(), computeLeaders(), makePeriod(), monthlyRows(), periodAgg(), printed(), seedNotes() (+1 more)

### Community 63 - "Agent History View"
Cohesion: 0.15
Nodes (15): agentHistoryHtml(), agentNums(), histAll(), histFor(), histIndex(), histPeople(), pageHistRec(), personHistoryHtml() (+7 more)

### Community 64 - "Design System and Fonts"
Cohesion: 0.16
Nodes (10): README.md (MC Monthly Report Builder), apple-design-skill (dickwu), MC Monthly Report Builder (offline HTML tool), v33 source (restored from MC Monthly Report Builder.md, Part 2), WriterInc, GEIST-OFL.txt (Geist font licence), Geist typeface (The Geist Project Authors), SIL Open Font License 1.1 (+2 more)

### Community 65 - "Performance Deck Tests"
Cohesion: 0.13
Nodes (12): Core, fs, { msgFile, sampleBody }, path, Pptx, PrDeck, ref, repo (+4 more)

### Community 66 - "Attendance Template Tests"
Cohesion: 0.13
Nodes (9): assert, Att, AttTpl, Core, path, PEOPLE, tests, Writer2 (+1 more)

### Community 67 - "Core Unit Tests"
Cohesion: 0.13
Nodes (12): assert, Att, built, Core, Forms, fs, Glue, History (+4 more)

### Community 68 - "GSAP Library Internals B"
Cohesion: 0.19
Nodes (15): Ae(), ce(), $d(), ee(), he(), ka(), le(), ma() (+7 more)

### Community 70 - "Attendance Templates Page"
Cohesion: 0.34
Nodes (13): attTplBar(), openAttTpl(), renderAttTpl(), tplBytes(), tplDownload(), tplDownloadAll(), tplFile(), tplFor() (+5 more)

### Community 71 - "Performance Review Tests"
Cohesion: 0.16
Nodes (10): msgFile(), sampleBody(), { chromium }, Core, fixture, fs, H, { msgFile, sampleBody } (+2 more)

### Community 72 - "Excel XLS Readers"
Cohesion: 0.21
Nodes (8): CFB(), parseSST(), parseXls(), parseXlsx(), read(), rkToNumber(), unicodeString(), History

### Community 73 - "Data Loading and Start"
Cohesion: 0.22
Nodes (13): applySettings(), buildSl(), folderStart(), initStorage(), loadAttState(), loadData(), loadSnaps(), localDb() (+5 more)

### Community 74 - "Quality Page Tests"
Cohesion: 0.15
Nodes (11): Role workspace views (#v-dash, #v-team, #v-results, #v-cycle, #v-quality, #v-me, #v-wait, #v-blocked), Dashboard (D2, D6), Quality page (Final EVAL template), assert, { chromium }, Core, { evalBook }, fixture (+3 more)

### Community 75 - "Data Folder Tests"
Cohesion: 0.15
Nodes (8): { chromium }, fixture, fs, html, [page0, out], path, { webcrypto }, zlib

### Community 76 - "Smart-Link Workbook Tests"
Cohesion: 0.15
Nodes (8): assert, Core, HEAD, path, ROWS, TAIL, tests, Writer2

### Community 77 - "Person Performance Panel"
Cohesion: 0.21
Nodes (12): attStripHtml(), formsListHtml(), kpiCardHtml(), perfAgg(), perfCardHtml(), perfSectionHtml(), perfTeam(), perfVs() (+4 more)

### Community 78 - "Synthetic Export Generator"
Cohesion: 0.18
Nodes (7): agents, fs, path, sch, tl, wd(), work()

### Community 79 - "Reconcile Unit Tests"
Cohesion: 0.17
Nodes (9): assert, Core, History, Kpi, { oldBooks, excelCounts }, path, Recon, tests (+1 more)

### Community 80 - "Weekly Page Tests"
Cohesion: 0.18
Nodes (9): { chromium }, Core, fixture, fs, H, oct(), pad(), [page0, out = 'test/shots'] (+1 more)

### Community 81 - "GSAP Library Internals C"
Cohesion: 0.24
Nodes (12): Ao(), cb(), cc(), ga(), gb(), ha(), hb(), r() (+4 more)

### Community 82 - "Attendance Corrections Store"
Cohesion: 0.22
Nodes (11): ago(), applyDistribution(), attEditsOf(), autoAttendance(), editAttDay(), editedDay(), leaveCode(), markFresh() (+3 more)

### Community 83 - "Report Builder Preferences"
Cohesion: 0.24
Nodes (11): dmBrandsOf(), rbHistIn(), rbInSave(), rbPrefsCarry(), rbPrefsChanged(), rbPrefsIn(), rbPrefsOf(), rbPrefsSave() (+3 more)

### Community 84 - "Department Scorecard Tests"
Cohesion: 0.18
Nodes (9): KPI scorecards drawer (#dScore), CT team's incentive workbook import, Every department's scorecard, { chromium }, fixture, fs, out, page0 (+1 more)

### Community 85 - "One-page Form Tests"
Cohesion: 0.18
Nodes (7): assert, Forms, huge, long, path, res, usual

### Community 86 - "Supply Chain Tests"
Cohesion: 0.18
Nodes (7): crypto, fs, got, page, path, pkg, root

### Community 87 - "GSAP Tween Core"
Cohesion: 0.24
Nodes (11): V(), _assertThisInitialized(), ic(), ta(), Timeline(), Tween(), w(), x() (+3 more)

### Community 88 - "GSAP Library Internals D"
Cohesion: 0.24
Nodes (11): _a(), Context(), Db(), Eb(), fb(), Gc(), Gw(), Hc() (+3 more)

### Community 89 - "Title Case Captions"
Cohesion: 0.27
Nodes (9): TC_PART, TC_PREFIX, TC_SMALL, TC_UNIT, TC_VERB, tcCap(), tcEl(), tcScan() (+1 more)

### Community 90 - "Vacation Cover"
Cohesion: 0.38
Nodes (9): COVER_GETS, COVER_OF, coverLive(), coverLoaded(), coverPeople(), coverRoleFor(), meId(), renderCoverNote() (+1 more)

### Community 91 - "Build Workflow Docs"
Cohesion: 0.22
Nodes (9): Recon, How to use drawer (#dHelp), Import view (#v-import), Review view (#v-review), datesMonth(), Build workflow: Import, Review (Checks), Export, Emails, Genesys Cloud exports (Monthly Adherence, Agent Performance Summary, Schedule, Agent Status Timeline), Reconcile with the old Excel (+1 more)

### Community 92 - "No-schedule Tests"
Cohesion: 0.20
Nodes (6): { chromium }, { execFileSync }, fixture, fs, [page0, exp, out], path

### Community 93 - "Attendance Flow Tests"
Cohesion: 0.20
Nodes (6): { chromium }, Core, fixture, fs, [page0, exp, out], path

### Community 94 - "Old Workbook Fixtures"
Cohesion: 0.33
Nodes (8): AUG(), excelCounts(), month(), oldBooks(), path, SEP(), weekend(), Writer2

### Community 95 - "Screenshot Tests"
Cohesion: 0.20
Nodes (8): { chromium }, fixture, fs, out, page0, path, S, USERS

### Community 96 - "Deck Screenshot Script"
Cohesion: 0.20
Nodes (7): { chromium }, fixture, fs, NOW, [page0, exp, out], path, USERS

### Community 97 - "Live Scoring Inputs"
Cohesion: 0.22
Nodes (9): csatAll(), daysOfRow(), figValue(), fileValues(), kpiFileRowK(), kpiOver(), ksrcRowK(), ownerOf() (+1 more)

### Community 98 - "Report Builder Publishing"
Cohesion: 0.31
Nodes (9): rbDayKeyOf(), rbFieldIn(), rbHasBrandData(), rbLater(), rbName(), rbPublish(), rbPublishSoon(), rbSendRender() (+1 more)

### Community 99 - "Motion Tests"
Cohesion: 0.28
Nodes (8): as(), { chromium }, fixture, fs, later(), ok(), [page0, out], path

### Community 100 - "Reconcile Browser Tests"
Cohesion: 0.22
Nodes (7): { chromium }, fixture, fs, { oldBooks }, out, page0, path

### Community 101 - "Theme Tests"
Cohesion: 0.22
Nodes (7): admin, agent, { chromium }, fixture, fs, [page0, out], path

### Community 102 - "Document Generation Tests"
Cohesion: 0.22
Nodes (7): AttTpl, form, Forms, fs, path, people, res

### Community 103 - "Leaders Email Render"
Cohesion: 0.57
Nodes (7): block(), cell(), esc(), head(), render(), sectionHead(), table()

### Community 104 - "Start Guard Boot"
Cohesion: 0.29
Nodes (8): check() (start guard), esc() (start guard), go() (start guard), links() (start guard), window.__mcBoot (start-guard state), tooOld() (start guard), Sign-in and lock dialog (#lock, #lockForm), Opening the shared data

### Community 105 - "Folder Tests"
Cohesion: 0.25
Nodes (6): { chromium }, fixture, fs, html, [page0, exp, out], path

### Community 106 - "Overlay Tests"
Cohesion: 0.25
Nodes (6): { chromium }, fixture, fs, [page0, out], path, U

### Community 107 - "WFM Team Tests"
Cohesion: 0.25
Nodes (6): { chromium }, fixture, fs, [page0, out], path, PEOPLE

### Community 108 - "GSAP Library Internals E"
Cohesion: 0.25
Nodes (6): Aa(), Ca(), na(), Vb(), wb(), Xb()

### Community 109 - "Agent Page Publishing"
Cohesion: 0.29
Nodes (7): agentRowCopy(), publishAgent(), publishMonthToAgents(), qObsOf(), qRow(), qUp(), supOfP()

### Community 110 - "Incentive Base Pay"
Cohesion: 0.38
Nodes (6): baseOf(), basesNow(), baseWhy(), cardPay(), monthBase(), PrDeck

### Community 111 - "Brand History Import"
Cohesion: 0.38
Nodes (7): dhDay(), dhMon(), dhRows(), dhSpan(), dhWhat(), dmHistImport(), dmHistRender()

### Community 112 - "Appearance Theme Setting"
Cohesion: 0.38
Nodes (5): theme_boot.html (#themeBoot: light or dark before the first paint), applyTheme(), App bar (#appbar), Settings drawer (#dSettings), setTheme()

### Community 113 - "Accounts Tests"
Cohesion: 0.29
Nodes (5): { chromium }, fs, html, [page0, out], path

### Community 114 - "Caption Case Tests"
Cohesion: 0.29
Nodes (6): CASES, { chromium }, fixture, fs, [page0], path

### Community 115 - "Peek Preview Tests"
Cohesion: 0.29
Nodes (5): { chromium }, fixture, fs, [page0, out], path

### Community 116 - "v33 Reference Extras"
Cohesion: 0.48
Nodes (6): attTotals(), COUNTED(), DAYCH(), daysOfRow(), LET, withEdits()

### Community 118 - "Corrections Applied to Month"
Cohesion: 0.33
Nodes (6): attTotals(), excAct(), excOfEdits(), kdrOf(), keptCount(), withEdits()

### Community 119 - "File Recognition Core"
Cohesion: 0.33
Nodes (5): Recog, Recognise files drawer and drop overlay (#dRecog, #dropAll), Recognise files (one drop zone), rec(), run()

### Community 120 - "Build Flow Tests"
Cohesion: 0.33
Nodes (5): { chromium }, fixture, fs, [page0, exp, out, theme = 'dark'], path

### Community 121 - "Presentation Decks"
Cohesion: 0.60
Nodes (4): Pptx, MC Performance Review deck, Weekly Commercial Presentation, WFM team page

### Community 122 - "Recogniser Test Data"
Cohesion: 0.40
Nodes (5): AHT, dt(), PERF, SCH, TL

### Community 123 - "GSAP Library Internals F"
Cohesion: 0.60
Nodes (5): Animation(), Da(), la(), Ua(), Va()

### Community 124 - "GSAP Library Internals G"
Cohesion: 0.40
Nodes (5): kb(), ob(), ra(), rb(), Za()

### Community 126 - "Deck Build Script"
Cohesion: 0.50
Nodes (3): Stakeholder deck (MC Monthly Report Builder - Overview.pptx), NODE_PATH, build.sh script

## Ambiguous Edges - Review These
- `Incentive email (Supervisors › Incentive email)` → `Payroll acceptance gate`  [AMBIGUOUS]
  council/sessions/2026-10-19-mc-report-builder-internal.md · relation: conceptually_related_to

## Knowledge Gaps
- **15 isolated node(s):** `RFC-4180`, `NODE_PATH`, `apple-design-skill (dickwu)`, `Stakeholder deck (MC Monthly Report Builder - Overview.pptx)`, `App bar (#appbar)` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 850 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Injection into the page check (OWASP A03, CWE-79)` connect `XSS Injection Checks` to `WFM Daily Review Report`, `Council Session Verdicts`, `Leaders Email Render`, `Build Import and KPI Model`, `Uploads and Agent Tests`, `Security Review Skill`, `Daily Email Rendering`?**
  _High betweenness centrality (0.218) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `refresh()` (e.g. with `ui3.js` and `openNotes()`) actually correct?**
  _`refresh()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `NODE_PATH`, `apple-design-skill (dickwu)` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Results and Month Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.051544791181493556 - nodes in this community are weakly interconnected._
- **Why does `x()` connect `GSAP Tween Core` to `Senior Month Close Emails`, `Build Import and KPI Model`, `GSAP Library Internals A`, `Weekly Commercial Page`, `Stakeholder Deck Builder`?**
  _High betweenness centrality (0.131) - this node is a cross-community bridge._
- **Should `Find Search Answers` be split into smaller, more focused modules?**
  _Cohesion score 0.07997038134024435 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Incentive email (Supervisors › Incentive email)` and `Payroll acceptance gate`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._