# Fixed Profile Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a fixed-position profile popup to prevent container clipping in the sidebar.

**Architecture:** Use `fixed` positioning for the user profile menu, calculated based on the trigger button's position. Polish the CSS for the `.popover-menu` to ensure a high-fidelity look and feel.

**Tech Stack:** React, CSS Modules/Variables

---

### Task 1: Update `getUserMenuStyles` in `App.tsx`

**Files:**
- Modify: `src/renderer/App.tsx`

- [ ] **Step 1: Update styles calculation**

Replace the current `getUserMenuStyles` implementation:
```tsx
  const getUserMenuStyles = () => {
    if (!userBtnRef.current) return {};
    const rect = userBtnRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      left: '12px',
      bottom: (window.innerHeight - rect.top + 8) + 'px',
      zIndex: 9999
    };
  };
```

- [ ] **Step 2: Verify the change in code**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx
git commit -m "feat(renderer): update profile menu positioning logic"
```

### Task 2: Polish `.popover-menu` in `index.css`

**Files:**
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Update CSS for `.popover-menu`**

Replace the `.popover-menu` rule:
```css
.popover-menu {
  position: fixed;
  background-color: var(--bg-input);
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 8px;
  box-shadow: var(--shadow-xl);
  min-width: 240px;
  backdrop-filter: blur(12px);
}
```

- [ ] **Step 2: Verify the change in code**

- [ ] **Step 3: Commit**

```bash
git add src/renderer/index.css
git commit -m "style(renderer): polish popover menu appearance"
```

### Task 3: Final Verification

- [ ] **Step 1: Check for any linting/compilation errors**

Run: `npm run build` (or equivalent if applicable)

- [ ] **Step 2: Commit final changes**

```bash
git commit -m "fix: use fixed positioning for user profile menu to prevent clipping"
```
