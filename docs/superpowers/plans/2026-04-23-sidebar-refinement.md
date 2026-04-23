# Sidebar Proportions & Alignment Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the sidebar proportions to a "snug/precision" look with 32px buttons and zero-drift icons while fixing popup clipping.

**Architecture:** Introduce a fixed 60px `btn-icon-box` anchor for all sidebar rows to eliminate transition drift. Shrink button footprints to 32px (snug fit) and use `position: fixed` for the user profile menu to escape container clipping.

**Tech Stack:** React, CSS, Electron.

---

### Task 1: Update CSS Variables & Base Button Styles

**Files:**
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Update CSS variables and refined button tokens**

```css
:root {
  /* ... existing colors ... */
  --sidebar-width: 260px;
  --sidebar-mini-width: 60px; /* The Anchor Axis */
  /* ... */
}

/* Base refinement for the precision look */
.sidebar-btn {
  display: flex;
  align-items: center;
  width: calc(100% - 16px);
  height: 32px; /* Precision 32px height */
  margin: 0 8px;
  background: transparent;
  border: none;
  color: var(--white);
  cursor: pointer;
  padding: 0;
  transition: var(--transition);
  border-radius: 8px; /* radius-md */
}

.sidebar.collapsed .sidebar-btn {
  margin: 0 14px; /* Centering 32px btn in 60px strip: (60-32)/2 = 14 */
  width: 32px;
}

.btn-icon-box {
  width: var(--sidebar-mini-width);
  min-width: var(--sidebar-mini-width);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/index.css
git commit -m "style: update sidebar button variables and base precision styles"
```

---

### Task 2: Refactor Sidebar Structure for Zero-Drift Anchoring

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Wrap sidebar header and footer icons in btn-icon-box**

```tsx
// In src/renderer/App.tsx

// Sidebar Header Refactor
<header className="sidebar-header">
  <div className="sidebar-row collapse-row">
     <button className="collapse-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
       <div className="btn-icon-box">
         <svg width="20" height="20" ... />
       </div>
     </button>
  </div>
  <div className="sidebar-row">
     <button className="sidebar-btn new-chat-btn" onClick={handleNewChat}>
       <div className="btn-icon-box">
         <svg width="20" height="20" ... />
       </div>
       <span>New chat</span>
     </button>
  </div>
</header>

// Sidebar Footer Refactor
<footer className="sidebar-footer">
  <div className="sidebar-row">
    <button ref={userBtnRef} className="sidebar-btn user-profile-btn" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
      <div className="btn-icon-box">
        <div className="avatar">JD</div>
      </div>
      <span>John Doe</span>
    </button>
  </div>
</footer>
```

- [ ] **Step 2: Adjust row alignment in CSS**

```css
.sidebar-row {
  display: flex;
  align-items: center;
  width: 100%;
  height: 36px; /* Match vertical distance rule */
}

.collapse-row {
  justify-content: flex-end;
}

.sidebar.collapsed .collapse-row {
  justify-content: center;
}

.collapse-btn {
  width: 32px;
  height: 32px;
  margin-right: 14px; /* Align to anchor center: 8px padding + (60-32)/2? No, fixed right */
}

.sidebar.collapsed .collapse-btn {
  margin-right: 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx src/renderer/index.css
git commit -m "refactor: implement zero-drift btn-icon-box anchoring"
```

---

### Task 3: Implement Fixed-Position Profile Popup

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/index.css`

- [ ] **Step 1: Update popup positioning logic**

```tsx
// In src/renderer/App.tsx
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

- [ ] **Step 2: Polish popover styles**

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

- [ ] **Step 3: Commit**

```bash
git add src/renderer/App.tsx src/renderer/index.css
git commit -m "fix: use fixed positioning for user profile menu to prevent clipping"
```

---

### Task 4: Final Proportion Verification & Polish

- [ ] **Step 1: Verify 36px vertical distance between all items**
- [ ] **Step 2: Verify zero-drift transition**
- [ ] **Step 3: Final Build check**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: final proportion validation and cleanup"
```
