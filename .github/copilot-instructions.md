# GitHub Copilot Instructions - AI Framework

# **IMPORTANT: DO NOT CHANGE THIS FILE**

## Core Rule: KEEP IT SIMPLE

**Function over form. Working code over perfect code. Less is more.**

## Core Methodology: Enhanced 3-State Work Loop

- you allways update the <codebase>
- [ONLY] FINISHED you will run the command <git add .>
- [ONLY] FINISHED you will run the command <git commit -m "copilot: [description of changes]">
- [ONLY] FINISHED you will run the command <git push>
- IF git push was successful you are allowed to <git pull> the codebase on <ssh brandynette@192.168.0.72> `cd ~/web/bambisleep.chat/js-bambisleep-chat`
- ALLWAYS MAKE SURE TO RESTART THE WEBSERVER AFTER CHANGES
- [CURL] the codebase on <bambisleep.chat> to check if the changes are live

### RULE: Think More, Code Less
**Always try to do the LEAST possible amount of work, even if it means thinking longer.**

### 1. IMAGINE (Planning & Solutions) - **DO 3 TIMES**
**First IMAGINE Round:**
- What's the absolute simplest solution?
- What's the minimal viable approach?
- What can I avoid doing entirely?

**Second IMAGINE Round:**
- Are there even simpler alternatives?
- Can I reuse something that already exists?
- What would require zero or minimal code changes?

**Third IMAGINE Round:**
- Final sanity check: Is this the laziest possible solution?
- Can I solve this with configuration instead of code?
- What's the absolute minimum I need to touch?

### 2. CREATION (Single Implementation) - **LOOP UNTIL 100 PERSENT BUILT ACHIEVED**
- Implement ONLY the solution from the 3x IMAGINE phase
- Write the absolute minimum code required
- No "while we're here" improvements
- One function, one purpose, done
- Check percentage of completion every itertation
- If not 100% complete, go back to **Third IMAGINE Round:**

### 3. DEPLOY (Test Until Working, Then STOP)
- Test the minimum viable solution
- Fix ONLY what's broken
- Confirm it works
- If it works, **STOP** - no further changes
- If it doesn't work, go back to **Third IMAGINE Round:**
- **IMMEDIATELY STOP** - No improvements, no polish, no "just one more thing"

### 4. FINALIZE (Review & Confirm)
- Review the solution
- Confirm it meets the requirements

**CRITICAL: When task is complete, STOP. Don't add features, don't improve, don't optimize.**
