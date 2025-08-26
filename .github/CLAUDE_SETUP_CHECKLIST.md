# Claude Code Setup Checklist

## Quick Setup (5 minutes)

### Step 1: Add Anthropic API Key to GitHub Secrets

- [ ] Get API key from https://console.anthropic.com/
- [ ] Go to: https://github.com/[your-org]/mirubato/settings/secrets/actions
- [ ] Click "New repository secret"
- [ ] Name: `ANTHROPIC_API_KEY`
- [ ] Value: [Paste your Anthropic API key]
- [ ] Click "Add secret"

### Step 2: Configure Access Control

- [ ] Review `.github/CODEOWNERS` file
- [ ] Ensure only trusted users are listed
- [ ] Note: Only CODEOWNERS can use @claude

### Step 3: Deploy Workflow File

- [ ] Use `.github/workflows/claude-code.yml`
- [ ] Includes authorization check (CODEOWNERS only)
- [ ] Full error handling and reactions
- [ ] Automatically reads authorized users from CODEOWNERS

### Step 4: Test the Integration

- [ ] Create a test issue
- [ ] Comment: `@claude Hello! Can you see this?` (must be a CODEOWNER)
- [ ] Wait for Claude's response (usually within 30 seconds)
- [ ] Check Actions tab if no response

## Required Permissions

Repository Settings → Actions → General:

- [ ] Actions permissions: "Allow all actions and reusable workflows"
- [ ] Workflow permissions: "Read and write permissions"

## Verification Steps

1. **Check Secret is Set**:

   ```
   Settings → Secrets → Actions → ANTHROPIC_API_KEY should be listed
   ```

2. **Check Workflow is Active**:

   ```
   Actions tab → "Claude Code" should appear in workflows list
   ```

3. **Test with Simple Query**:
   ```markdown
   @claude What version of TypeScript does this project use?
   ```

## Troubleshooting Quick Fixes

| Problem                | Solution                                   |
| ---------------------- | ------------------------------------------ |
| No response to @claude | Check if ANTHROPIC_API_KEY is set          |
| Workflow not running   | Check Actions are enabled in Settings      |
| Authentication error   | Regenerate and update API key              |
| Partial responses      | The simple config has default token limits |

## Getting Your API Key

1. Go to: https://console.anthropic.com/
2. Sign in or create account
3. Navigate to API Keys section
4. Create new key with appropriate permissions
5. Copy key immediately (shown only once)
6. Add as `ANTHROPIC_API_KEY` secret

## Cost Considerations

- Claude Code uses Claude API tokens
- Typical code review: ~2,000-4,000 tokens
- Check usage at: https://console.anthropic.com/usage
- Consider setting spending limits in Anthropic console

## Access Control

### Who Can Use Claude?

- Only users listed in `.github/CODEOWNERS`
- Unauthorized users receive an error message
- To grant access: Add username to CODEOWNERS file

## Team Usage Guidelines

### DO ✅

- Use @claude for code reviews
- Ask for bug investigation help
- Request documentation improvements
- Ask about best practices
- Get help with complex algorithms

### DON'T ❌

- Share sensitive data in comments
- Expect Claude to have access to secrets
- Use for non-technical discussions
- Spam with repeated questions
- Share API keys in comments

## Quick Test Messages

Copy and paste these to test:

```markdown
@claude Can you explain the purpose of this repository?
```

```markdown
@claude What are the main technologies used in this project?
```

```markdown
@claude Please review the most recent commit for code quality.
```

## Next Steps

1. **After Setup**: Monitor usage in Actions tab
2. **Monitor Usage**: Check API usage weekly initially
3. **Collect Feedback**: Ask team about their experience
4. **Customize Prompts**: Adjust workflow for your team's needs
5. **Document Patterns**: Keep track of useful @claude queries

## Support Resources

- Anthropic Documentation: https://docs.anthropic.com/
- GitHub Actions Docs: https://docs.github.com/en/actions
- Our Guide: `.github/CLAUDE_CODE_GUIDE.md`

## Security Reminders

⚠️ **Never**:

- Commit API keys to the repository
- Share API keys in issues or PRs
- Include sensitive data in @claude queries
- Use production data in examples

✅ **Always**:

- Use GitHub Secrets for API keys
- Review Claude's suggestions before implementing
- Keep API key permissions minimal
- Monitor API usage and costs
