# Claude Code Assistant Guide for Mirubato

## 🤖 Overview

Claude Code Assistant is integrated into our GitHub workflow to help with code reviews, bug fixes, and answering technical questions directly in issues and pull requests.

## 🚀 Setup Instructions

### 1. Add the Anthropic API Key

Repository administrators need to add the API key as a GitHub secret:

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key
5. Click "Add secret"

### 2. Enable GitHub Actions

Ensure GitHub Actions are enabled for the repository:

- Settings → Actions → General → Actions permissions
- Select "Allow all actions and reusable workflows"

## 🔒 Authorization & Security

**Important**: Claude Code is restricted to CODEOWNERS only. Currently authorized users:

- @arbeitandy
- @xia-ann

Unauthorized users will receive an error message when trying to use @claude.

### Security Restrictions

Claude has been configured with strict limitations:

**Claude CAN:**

- ✅ Review code and provide feedback
- ✅ Comment on issues and PRs
- ✅ Create new branches and PRs
- ✅ Push code to feature branches

**Claude CANNOT:**

- ❌ Merge pull requests (human review required)
- ❌ Push directly to main branch
- ❌ Delete branches or repositories
- ❌ Modify repository settings
- ❌ Access secrets or sensitive data
- ❌ Respond to external users (non-CODEOWNERS)

## 📝 How to Use Claude Code

### In Issues

Simply mention `@claude` in your issue comment with your question:

```markdown
@claude Can you help me understand why the score ID normalization is failing for pieces with dashes in the title?
```

### In Pull Requests

Mention `@claude` in:

- Pull request description
- Pull request comments
- Code review comments

```markdown
@claude Please review this implementation for potential security issues and performance improvements.
```

### Example Commands

#### Code Review

```markdown
@claude Please review this PR focusing on:

- Security vulnerabilities
- Performance implications
- Code quality
- Test coverage
```

#### Bug Investigation

```markdown
@claude I'm seeing duplicate entries in the logbook. Can you help identify the root cause by examining the sync logic?
```

#### Implementation Help

```markdown
@claude How should I implement the admin API endpoints for the debug-data-fix tool?
```

#### Create a PR from Issue (NEW)

```markdown
@claude Please implement the feature described in this issue and create a PR
```

#### Fix a Bug with PR (NEW)

```markdown
@claude This bug is causing errors in production. Can you fix it and create a PR with the solution?
```

#### Architecture Questions

```markdown
@claude What's the best approach to handle WebSocket reconnection in our sync-worker?
```

### Using Labels to Trigger Claude

You can also trigger Claude by adding labels to issues:

- `claude` - Triggers Claude to review the issue
- `ai-implement` - Asks Claude to implement the feature and create a PR

**Note**: Even with labels, only CODEOWNERS can create issues that trigger Claude.

## 🎯 Best Practices

### 1. Be Specific

Provide context and be specific about what you need:

- ❌ `@claude help`
- ✅ `@claude Can you explain how the score ID delimiter change affects backward compatibility?`

### 2. Include Error Messages

When debugging, include relevant error messages:

```markdown
@claude I'm getting this error when running the fix command:
```

Error: D1 query failed: UNIQUE constraint failed: sync_data.entity_id

```
What's causing this and how can I fix it?
```

### 3. Reference Files

Mention specific files when asking about code:

```markdown
@claude In `src/utils/scoreIdNormalizer.ts`, why do we use `||` as delimiter only when there's a dash in the title?
```

### 4. Ask for Tests

Request test cases for new implementations:

```markdown
@claude Please suggest test cases for the duplicate detection logic in the debug tool.
```

## 🔒 Security Considerations

### What Claude Code CAN Access:

- Public repository code
- Issue and PR content
- Git history and commits
- File structure

### What Claude Code CANNOT Access:

- Secret values (API keys, tokens)
- Private repository data
- User authentication tokens
- Database contents
- Production data

## ⚙️ Configuration

### Authentication

The workflow uses Anthropic API key authentication:

```yaml
anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### Workflow Location

- Single workflow file: `.github/workflows/claude-code.yml`
- Automatically reads CODEOWNERS for authorization
- Full error handling and user feedback
- Minimal logging for security (no usernames logged)

## 🔄 Pull Request Workflow

When Claude creates a pull request:

1. **Branch Creation**: Claude creates a feature branch (never pushes to main)
2. **Implementation**: Claude implements the requested changes
3. **PR Creation**: Claude opens a PR with description and context
4. **Human Review Required**: A team member must review and approve
5. **Manual Merge**: Only humans can merge PRs to main branch

### Safety Features

- All PRs created by Claude are marked with a label
- Claude cannot approve its own PRs
- Claude cannot merge any PRs
- Branch protection rules still apply

## 🚦 Rate Limits & Access Control

### Access Control

- Authorization is managed via `.github/CODEOWNERS`
- The workflow dynamically reads authorized users from this file
- To grant access: Add `@username` to `.github/CODEOWNERS`
- To revoke access: Remove username from `.github/CODEOWNERS`

### Current Authorized Users

The workflow reads from `.github/CODEOWNERS`. If the file can't be read, it falls back to:

- @arbeitandy
- @xia-ann

### Anthropic API

- Check your Anthropic account for rate limits
- Consider implementing queuing for high-volume usage

### GitHub API

- The workflow includes rate limit checking
- GitHub Actions have generous rate limits for repository actions

## 🐛 Troubleshooting

### Claude Not Responding

1. **Check GitHub Actions tab**: Verify the workflow is running
2. **Verify API key**: Ensure `ANTHROPIC_API_KEY` secret is set
3. **Check mentions**: Must include `@claude` in the comment
4. **Review logs**: Check workflow logs for errors

### Common Issues

| Issue                | Solution                                                            |
| -------------------- | ------------------------------------------------------------------- |
| No response          | Check if `@claude` is mentioned correctly and user is in CODEOWNERS |
| Partial response     | Increase `max_tokens` in workflow                                   |
| Authentication error | Verify `ANTHROPIC_API_KEY` secret                                   |
| Rate limit exceeded  | Wait and retry, or upgrade API plan                                 |

## 📊 Usage Monitoring

Monitor Claude Code usage:

1. **GitHub Actions**: Actions tab → Filter by `Claude Code Assistant`
2. **API Usage**: Check Anthropic dashboard for API usage
3. **Cost Tracking**: Monitor token usage in Anthropic console

## 🔄 Workflow Triggers

The Claude Code Assistant responds to:

- **Issue comments**: When someone comments on an issue
- **PR comments**: When someone comments on a pull request
- **PR review comments**: When someone comments during code review
- **New issues**: When an issue is opened with `@claude` mention
- **New PRs**: When a PR is opened with `@claude` mention

## 💡 Tips for Team Members

1. **Use for Learning**: Ask Claude to explain complex code sections
2. **Code Reviews**: Get a second opinion on your implementation
3. **Bug Hunting**: Use Claude to help trace through complex issues
4. **Documentation**: Ask Claude to help write or improve documentation
5. **Best Practices**: Query about best practices for specific scenarios

## 🚫 Limitations

- Cannot make direct code changes (suggestions only)
- Cannot access private/sensitive data
- Response length limited by token settings
- May not have context about very recent changes

## 📚 Examples from Our Codebase

### Debugging Score IDs

```markdown
@claude Why are we seeing mismatches between `moonlight-sonata-beethoven` and `moonlight-sonata||beethoven` in our repertoire?
```

### Performance Optimization

```markdown
@claude The logbook query in `D1Service.getSyncData()` is slow. Can you suggest indexing strategies?
```

### Security Review

```markdown
@claude Please review the admin token implementation in `apiService.ts` for security vulnerabilities.
```

## 🤝 Contributing to Claude Code Workflow

To improve the Claude Code integration:

1. Edit `.github/workflows/claude-code.yml`
2. Test in a feature branch
3. Create PR with your improvements
4. Tag with `github-actions` label

## 📞 Support

For issues with Claude Code:

1. Check this guide first
2. Review workflow logs
3. Contact repository administrators
4. Open an issue with `claude-assistant` label
