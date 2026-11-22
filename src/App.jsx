import React, { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { Bell, BookOpen, CalendarCheck, CalendarDays, ChevronDown, ChevronRight, CircleHelp, ClipboardList, GraduationCap, LayoutDashboard, LogIn, LogOut, MapPin, Menu, Megaphone, Search, Settings2, University, Users, X } from 'lucide-react';
import { roleLabels } from '../shared/sample.js';
import { attendanceStats, campusApi, displayDate, initials, readDemo, sampleAccounts, saveDemo, scopeData } from './data.js';
import { CampusMap } from './CampusMap.jsx';
import { Attendance, Announcements, Directory, Profile, Reports, SignIn, WorkspaceDialog } from './Workspace.jsx';

const general = [
  ['overview', 'Overview', LayoutDashboard],
  ['students', 'Students', GraduationCap],
  ['faculty', 'Faculty', Users],
  ['courses', 'Courses', BookOpen],
  ['attendance', 'Attendance', CalendarCheck],
  ['announcements', 'Announcements', Megaphone],
];
const operations = [
  ['sections', 'Sections', ClipboardList],
  ['reports', 'Reports', Settings2],
];
const titles = {
  overview: ['Campus overview', 'Explore your campus and keep up with university operations.'],
  students: ['Students', 'Manage student accounts and course enrolments.'],
  faculty: ['Faculty', 'Manage faculty accounts and academic departments.'],
  courses: ['Courses', 'Browse courses and manage the academic catalogue.'],
  sections: ['Sections', 'Manage teaching assignments and class rosters.'],
  attendance: ['Attendance', 'Review class sessions and subject-wise attendance.'],
  announcements: ['Announcements', 'Read and publish updates across the campus.'],
  reports: ['Reports', 'Review attendance thresholds and section enrolment.'],
  profile: ['Your profile', 'Manage your workspace profile.'],
};
const emptyData = { users: [], courses: [], sections: [], enrollments: [], attendance: [], announcements: [] };
const apiPaths = { users: '/users', courses: '/courses', sections: '/sections', enrollments: '/enrollments', attendance: '/attendance', announcements: '/announcements' };
const offlineFile = window.location.protocol === 'file:';
const getPage = () => window.location.hash.slice(1) || 'overview';
const route = key => `#${key}`;

async function allRecords(url) {
  const records = [];
  let page = 1;
  let result;
  do {
    result = await campusApi.request(`${url}?page=${page}&limit=100`);
    records.push(...result.items);
    page++;
  } while (records.length < result.total && result.items.length);
  return records;
}

export function App() {
  const [demo, setDemo] = useState(readDemo);
  const [demoRole, setDemoRole] = useState('admin');
  const [account, setAccount] = useState(null);
  const [liveData, setLiveData] = useState(emptyData);
  const [page, setPage] = useState(getPage);
  const [dialog, setDialog] = useState(null);
  const [panel, setPanel] = useState(null);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [readNotices, setReadNotices] = useState([]);
  const loadVersion = useRef(0);
  const user = account || demo.users.find(entry => entry.id === sampleAccounts[demoRole].id) || sampleAccounts[demoRole];
  const data = account ? liveData : scopeData(demo, user);
  const isAdmin = user.role === 'admin';
  const navigation = general.filter(([key]) => isAdmin || !['students', 'faculty'].includes(key));
  const visibleOperations = operations.filter(([key]) => key !== 'sections' || user.role !== 'student');
  const allowed = [...navigation, ...visibleOperations].map(([key]) => key).concat('profile');
  const activePage = allowed.includes(page) ? page : 'overview';

  function notify(message) {
    setToast(message);
  }

  function navigate(next) {
    window.location.hash = next;
    setPage(next);
    setPanel(null);
    setMobileOpen(false);
    setSearch('');
  }

  async function loadLiveData() {
    const version = ++loadVersion.current;
    try {
      const entries = await Promise.all(Object.entries(apiPaths).map(async ([name, path]) => [name, await allRecords(path)]));
      if (version !== loadVersion.current) return;
      setLiveData(Object.fromEntries(entries));
      setConnectionError('');
    } catch (error) {
      if (version === loadVersion.current) setConnectionError(error.message);
    }
  }

  useEffect(() => {
    const onHash = () => setPage(getPage());
    window.addEventListener('hashchange', onHash);
    let active = true;
    if (!offlineFile && sessionStorage.getItem('krmu-connected')) {
      campusApi.restore().then(session => {
        if (active) setAccount(session.user);
      }).catch(() => { sessionStorage.removeItem('krmu-connected'); });
    }
    return () => { active = false; window.removeEventListener('hashchange', onHash); };
  }, []);

  useEffect(() => {
    if (!account) return;
    loadLiveData();
    const socket = io({ auth: callback => callback({ token: campusApi.token() }) });
    const reload = () => loadLiveData();
    socket.on('connect', reload);
    socket.on('announcement:changed', reload);
    socket.on('attendance:changed', reload);
    let active = true;
    let retrying = false;
    const reconnect = async () => {
      if (retrying || !active) return;
      retrying = true;
      try {
        await campusApi.restore();
        if (active) socket.connect();
      } catch {
        // The workspace can still surface authentication errors through REST.
      } finally {
        retrying = false;
      }
    };
    socket.on('disconnect', reason => { if (reason === 'io server disconnect') reconnect(); });
    socket.on('connect_error', error => { if (error.message === 'UNAUTHORIZED') reconnect(); });
    const onFocus = () => {
      reload().then(() => {
        if (active && !socket.connected) socket.connect();
      });
    };
    window.addEventListener('focus', onFocus);
    return () => {
      active = false;
      loadVersion.current++;
      window.removeEventListener('focus', onFocus);
      socket.disconnect();
    };
  }, [account?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleKey = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (event.key === 'Escape') setPanel(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  function switchRole(role) {
    setDemoRole(role);
    navigate('overview');
    notify(`Sample workspace · ${roleLabels[role]}`);
  }

  async function signIn(credentials) {
    const session = await campusApi.login(credentials);
    setLiveData(emptyData);
    setAccount(session.user);
    sessionStorage.setItem('krmu-connected', '1');
    navigate('overview');
    setDialog(null);
    notify(`Signed in as ${session.user.name}`);
  }

  async function signOut() {
    try {
      await campusApi.logout();
      setAccount(null);
      sessionStorage.removeItem('krmu-connected');
      navigate('overview');
      notify('Signed out');
    } catch (error) {
      notify(error.message);
    }
  }

  async function mutate(collection, method, body, id) {
    if (account) {
      const query = collection === 'profile' ? '/users/me' : apiPaths[collection] + (id ? `/${id}` : '');
      const item = await campusApi.request(query, { method, body });
      if (collection === 'profile') setAccount(item);
      await loadLiveData();
      return item;
    }

    const next = structuredClone(demo);
    const key = collection === 'profile' ? 'users' : collection;
    const entries = next[key];
    const index = entries.findIndex(item => item.id === (collection === 'profile' ? user.id : id));
    if (method === 'DELETE') {
      const matches = key === 'users'
        ? next.sections.some(entry => entry.facultyId === id) || next.enrollments.some(entry => entry.studentId === id) || next.announcements.some(entry => entry.authorId === id)
        : key === 'courses' ? next.sections.some(entry => entry.courseId === id) || next.announcements.some(entry => entry.targetId === id)
          : key === 'sections' ? next.enrollments.some(entry => entry.sectionId === id) || next.attendance.some(entry => entry.sectionId === id) || next.announcements.some(entry => entry.targetId === id)
            : key === 'enrollments' && next.attendance.some(entry => entry.sectionId === entries[index]?.sectionId && entry.records.some(record => record.studentId === entries[index].studentId));
      if (matches) throw new Error('This record is still used by another campus record.');
      if (index < 0) throw new Error('Record not found.');
      entries.splice(index, 1);
    } else {
      const candidate = { ...entries[index], ...body };
      const uniqueFields = { users: [['email'], ['code']], courses: [['code']], sections: [['courseId', 'name', 'term']], enrollments: [['sectionId', 'studentId']], attendance: [['sectionId', 'date', 'slot']] };
      if (uniqueFields[key]?.some(fields => entries.some((entry, entryIndex) => entryIndex !== index && fields.every(field => String(entry[field]).toLowerCase() === String(candidate[field]).toLowerCase())))) {
        throw new Error('A matching record already exists.');
      }
      if (key === 'users') delete candidate.password;
      if (key === 'attendance') {
        delete candidate.reason;
        candidate.revision = (entries[index]?.revision || 0) + 1;
      }
      if (key === 'announcements' && method === 'POST') {
        candidate.authorId = user.id;
        candidate.createdAt = new Date().toISOString();
      }
      if (index < 0) entries.unshift({ id: crypto.randomUUID(), ...candidate });
      else entries[index] = candidate;
    }
    saveDemo(next);
    setDemo(next);
  }

  const announcements = [...data.announcements].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
  const unread = announcements.filter(entry => !readNotices.includes(entry.id)).length;
  const searchValue = search.trim().toLowerCase();
  const searchResults = [...navigation, ...visibleOperations].filter(([, label]) => label.toLowerCase().includes(searchValue));
  const courseResults = searchValue ? data.courses.filter(course => `${course.code} ${course.title}`.toLowerCase().includes(searchValue)).slice(0, 4) : [];
  const [title, subtitle] = titles[activePage];

  function showNotice(notice) {
    setReadNotices(ids => [...new Set([...ids, notice.id])]);
    setPanel(null);
    setDialog({ type: 'notice', notice });
  }

  const viewProps = { data, user, mutate, dialog: setDialog, notify, connected: !!account };
  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-overlay" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Campus navigation">
        <a className="brand" href="#overview" onClick={() => navigate('overview')}>
          <span className="brand-icon"><University size={23} strokeWidth={1.8} /></span>
          <span><strong>KRMU Campus</strong><small>University workspace</small></span>
        </a>
        <nav className="side-nav">
          <span className="nav-caption">WORKSPACE</span>
          {navigation.map(([key, label, Icon]) => <a key={key} href={route(key)} onClick={() => navigate(key)} aria-current={activePage === key ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{activePage === key && <ChevronRight size={15} className="nav-chevron" />}</a>)}
          <span className="nav-caption second">ACADEMICS</span>
          {visibleOperations.map(([key, label, Icon]) => <a key={key} href={route(key)} onClick={() => navigate(key)} aria-current={activePage === key ? 'page' : undefined}><Icon size={19} /><span>{label}</span>{activePage === key && <ChevronRight size={15} className="nav-chevron" />}</a>)}
        </nav>
        <div className="side-bottom">
          <button type="button" className="side-help" onClick={() => setDialog({ type: 'help' })}><CircleHelp size={19} /> Workspace guide</button>
          <div className="campus-identity"><span className="identity-icon"><MapPin size={17} /></span><span><strong>K.R. Mangalam University</strong><small>Gurugram, Haryana</small></span></div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb"><button className="icon-button mobile-toggle" aria-label="Open navigation" type="button" onClick={() => setMobileOpen(true)}><Menu size={22} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{activePage === 'overview' ? 'Overview' : title}</strong></div>
          <div className="header-actions">
            <div className="global-search">
              <Search size={17} />
              <input id="global-search" aria-label="Search workspace" placeholder="Search workspace…" value={search} onFocus={() => setPanel('search')} onChange={event => { setSearch(event.target.value); setPanel('search'); }} onKeyDown={event => {
                if (event.key === 'Enter' && searchResults.length) navigate(searchResults[0][0]);
                else if (event.key === 'Enter' && courseResults.length) { navigate('courses'); setDialog({ type: 'course', course: courseResults[0] }); }
              }} />
              <kbd>⌘ K</kbd>
              {panel === 'search' && <div className="header-popover search-results">
                {searchResults.map(([key, label, Icon]) => <button type="button" key={key} onClick={() => navigate(key)}><Icon size={17} />{label}</button>)}
                {courseResults.map(course => <button type="button" key={course.id} onClick={() => { navigate('courses'); setDialog({ type: 'course', course }); }}><BookOpen size={17} />{course.code} · {course.title}</button>)}
                {!searchResults.length && !courseResults.length && <p>No matching pages or courses.</p>}
              </div>}
            </div>
            <div className="header-menu">
              <button type="button" className="icon-button bell" aria-label={`Notifications (${unread} unread)`} aria-expanded={panel === 'notifications'} onClick={() => setPanel(panel === 'notifications' ? null : 'notifications')}><Bell size={20} />{unread > 0 && <i />}</button>
              {panel === 'notifications' && <div className="header-popover notifications"><strong>Notifications</strong>
                {announcements.length ? announcements.slice(0, 5).map(notice => <button key={notice.id} type="button" onClick={() => showNotice(notice)}><span><b>{notice.title}</b><small>{displayDate(notice.createdAt)}</small></span>{!readNotices.includes(notice.id) && <i className="notice-dot" />}</button>) : <p>No notifications yet.</p>}
              </div>}
            </div>
            <div className="header-divider" />
            <div className="header-menu">
              <button className="account-button" type="button" aria-expanded={panel === 'account'} onClick={() => setPanel(panel === 'account' ? null : 'account')}>
                <span className="avatar">{initials(user.name)}</span><span className="account-text"><strong>{user.name}</strong><small>{roleLabels[user.role]}</small></span><ChevronDown size={15} />
              </button>
              {panel === 'account' && <div className="header-popover account-popover">
                <button type="button" onClick={() => navigate('profile')}><Settings2 size={17} /> Your profile</button>
                {!account && <><p>Sample roles</p>{Object.entries(roleLabels).map(([role, label]) => <button key={role} type="button" aria-pressed={user.role === role} onClick={() => switchRole(role)}>{label}</button>)}
                  {!offlineFile && <button type="button" onClick={() => { setPanel(null); setDialog({ type: 'login' }); }}><LogIn size={17} /> Sign in to API</button>}</>}
                {account && <button type="button" onClick={signOut}><LogOut size={17} /> Sign out</button>}
              </div>}
            </div>
          </div>
        </header>
        {panel && <button className="popover-backdrop" type="button" aria-label="Dismiss menu" onClick={() => setPanel(null)} />}
        <main className="main" id="main">
          <div className="page-head">
            <div><div className="page-eyebrow"><span /> {account ? 'UNIVERSITY WORKSPACE' : 'SAMPLE WORKSPACE'}</div><h1>{title}</h1><p>{subtitle}</p></div>
            {activePage === 'overview' && <span className="date-chip"><CalendarDays size={17} /> {displayDate(new Date())}</span>}
          </div>
          {connectionError && account && <p className="error-banner" role="alert">{connectionError} <button type="button" className="text-button" onClick={loadLiveData}>Retry</button></p>}
          {activePage === 'overview' && <Overview data={data} user={user} navigate={navigate} showNotice={showNotice} announcements={announcements} />}
          {['students', 'faculty', 'courses', 'sections'].includes(activePage) && <Directory key={activePage} page={activePage} {...viewProps} />}
          {activePage === 'attendance' && <Attendance {...viewProps} />}
          {activePage === 'announcements' && <Announcements {...viewProps} onOpen={showNotice} />}
          {activePage === 'reports' && <Reports {...viewProps} />}
          {activePage === 'profile' && <Profile {...viewProps} />}
        </main>
      </div>
      {dialog?.type === 'login' ? <SignIn onClose={() => setDialog(null)} onSignIn={signIn} /> : dialog && <WorkspaceDialog {...viewProps} config={dialog} onClose={() => setDialog(null)} />}
      {toast && <div className="toast" role="status">{toast}<button type="button" className="icon-button" aria-label="Dismiss message" onClick={() => setToast('')}><X size={16} /></button></div>}
    </div>
  );
}

function Overview({ data, user, navigate, showNotice, announcements }) {
  const summaries = attendanceStats(data.attendance, data.sections);
  const total = summaries.reduce((sum, row) => sum + row.total, 0);
  const attended = summaries.reduce((sum, row) => sum + row.attended, 0);
  const percentage = total ? `${(attended / total * 100).toFixed(0)}%` : '—';
  const stats = [
    [user.role === 'student' ? 'Sections' : 'Students', user.role === 'student' ? data.sections.length : data.users.filter(entry => entry.role === 'student').length, 'Student enrolment', GraduationCap, 'violet', user.role === 'admin' ? 'students' : 'courses'],
    ['Faculty', data.users.filter(entry => entry.role === 'faculty').length, 'Teaching staff', Users, 'blue', user.role === 'admin' ? 'faculty' : 'courses'],
    ['Courses', data.courses.length, 'Academic catalogue', BookOpen, 'amber', 'courses'],
    ['Attendance', percentage, 'Marked class records', CalendarCheck, 'green', 'attendance'],
  ];
  return (
    <>
      <CampusMap />
      <div className="stat-grid">
        {stats.map(([label, number, description, Icon, color, target]) => <button className="stat-card" type="button" key={label} onClick={() => navigate(target)}>
          <div className="stat-card-top"><span className={`tile-icon ${color}`}><Icon size={20} /></span><ChevronRight size={17} /></div>
          <div className="stat-number">{number}</div><strong>{label}</strong><small>{description}</small>
        </button>)}
      </div>
      <section className="surface overview-notices">
        <div className="section-header"><div><h2>Recent announcements</h2><p>Updates from across the workspace</p></div><button className="text-button" type="button" onClick={() => navigate('announcements')}>View all <ChevronRight size={16} /></button></div>
        {announcements.length ? announcements.slice(0, 3).map(notice => <button className="notice-row" key={notice.id} type="button" onClick={() => showNotice(notice)}>
          <span className={`tile-icon ${notice.category === 'Academic' ? 'violet' : 'green'}`}><Megaphone size={18} /></span><span><strong>{notice.title}</strong><small>{notice.category} · {displayDate(notice.createdAt)}</small></span><ChevronRight size={17} />
        </button>) : <p className="empty">No announcements yet.</p>}
      </section>
    </>
  );
}
