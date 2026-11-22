import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, GraduationCap, Megaphone, PenLine, Plus, Search, Trash2, Users, X } from 'lucide-react';
import { departments, roleLabels, statusLabels } from '../shared/sample.js';
import { attendanceStats, campusApi, displayDate, indiaDate, initials } from './data.js';

const directoryConfig = {
  students: { collection: 'users', label: 'Student', Icon: GraduationCap, columns: ['Student', 'Student ID', 'Department'] },
  faculty: { collection: 'users', label: 'Faculty member', Icon: Users, columns: ['Faculty member', 'Staff ID', 'Department'] },
  courses: { collection: 'courses', label: 'Course', Icon: BookOpen, columns: ['Course', 'Code', 'Department', 'Credits'] },
  sections: { collection: 'sections', label: 'Section', Icon: ClipboardList, columns: ['Section', 'Course', 'Term', 'Assigned faculty'] },
};
const audienceLabels = { university: 'University-wide', section: 'Section', course: 'Course' };
const named = (list, id, key = 'name') => list.find(item => item.id === id)?.[key] || '—';
const sectionLabel = (data, section) => `${named(data.courses, section.courseId, 'code')} · ${section.name} · ${section.term}`;

function Table({ columns, rows, empty = 'No records found.' }) {
  return <div className="table-scroll"><table><thead><tr>{columns.map((column, i) => <th key={i} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.length ? rows.map(([key, ...cells]) => <tr key={key}>{cells.map((cell, index) => <td key={index}>{cell}</td>)}</tr>) : <tr><td className="empty" colSpan={columns.length}>{empty}</td></tr>}</tbody>
  </table></div>;
}
function AddButton({ children, onClick }) {
  return <button type="button" className="primary-button" onClick={onClick}><Plus size={18} />{children}</button>;
}
function Action({ label, Icon, onClick }) {
  return <button type="button" className="icon-button list-action" title={label} aria-label={label} onClick={onClick}><Icon size={17} /></button>;
}
function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}
function option(value, label = value) {
  return <option key={value} value={value}>{label}</option>;
}
function FilterSearch({ value, onChange, placeholder }) {
  return <label className="field-search"><Search size={17} /><input aria-label={placeholder} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} /></label>;
}

export function Directory({ page, data, user, dialog }) {
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [number, setNumber] = useState(1);
  const admin = user.role === 'admin';
  const cfg = directoryConfig[page];
  const people = cfg.collection === 'users';
  const list = people ? data.users.filter(entry => entry.role === (page === 'students' ? 'student' : 'faculty')) : data[cfg.collection];
  const filtered = list.filter(entry => {
    const text = [entry.name, entry.email, entry.title, entry.code, entry.term, named(data.courses, entry.courseId, 'title')].join(' ').toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (!department || entry.department === department);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(number, totalPages);
  const rows = filtered.slice((current - 1) * 10, current * 10).map(entry => {
    const title = entry.name || entry.title;
    const details = people
      ? [<span className="person-cell"><span className="avatar">{initials(title)}</span><span><strong>{title}</strong><small>{entry.email}</small></span></span>, entry.code, entry.department]
      : page === 'courses'
        ? [<button type="button" className="text-button" onClick={() => dialog({ type: 'course', course: entry })}>{title}</button>, entry.code, entry.department, entry.credits]
        : [<button type="button" className="text-button" onClick={() => dialog({ type: 'roster', section: entry })}>{title}</button>, named(data.courses, entry.courseId, 'title'), entry.term, named(data.users, entry.facultyId)];
    return [entry.id, ...details, ...(admin ? [<div className="table-actions">
      <Action label={`Edit ${title}`} Icon={PenLine} onClick={() => dialog({ type: 'edit', page, entry })} />
      <Action label={`Delete ${title}`} Icon={Trash2} onClick={() => dialog({ type: 'delete', collection: cfg.collection, entry, title })} />
    </div>] : [])];
  });
  return <section className="surface table-surface">
    <div className="table-toolbar">
      <FilterSearch value={query} onChange={value => { setQuery(value); setNumber(1); }} placeholder={`Search ${page}…`} />
      {page !== 'sections' && <select aria-label="Department" value={department} onChange={event => { setDepartment(event.target.value); setNumber(1); }}>{option('', 'All departments')}{[...new Set(list.map(item => item.department))].map(value => option(value))}</select>}
      {admin && <AddButton onClick={() => dialog({ type: 'edit', page })}>Add {cfg.label.toLowerCase()}</AddButton>}
    </div>
    <Table columns={[...cfg.columns, ...(admin ? ['Actions'] : [])]} rows={rows} />
    <div className="table-footer"><span>{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</span><div>
      <button className="icon-button" type="button" aria-label="Previous page" disabled={current <= 1} onClick={() => setNumber(current - 1)}><ChevronLeft size={18} /></button>
      <span>Page {current} of {totalPages}</span>
      <button className="icon-button" type="button" aria-label="Next page" disabled={current >= totalPages} onClick={() => setNumber(current + 1)}><ChevronRight size={18} /></button>
    </div></div>
  </section>;
}

export function Attendance({ data, user, dialog }) {
  const [sectionId, setSectionId] = useState('');
  const [date, setDate] = useState('');
  const sections = sectionId ? data.sections.filter(section => section.id === sectionId) : data.sections;
  const sessions = data.attendance.filter(session => sections.some(section => section.id === session.sectionId) && (!date || date === session.date))
    .sort((left, right) => right.date.localeCompare(left.date) || right.slot.localeCompare(left.slot));
  const student = user.role === 'student';
  const rows = sessions.map(session => [
    session.id, displayDate(session.date), session.slot, named(data.courses, sections.find(section => section.id === session.sectionId)?.courseId, 'title'),
    named(sections, session.sectionId),
    student ? <span className={`badge status-${session.records[0]?.status}`}>{statusLabels[session.records[0]?.status]}</span>
      : `${session.records.filter(record => ['present', 'late'].includes(record.status)).length} of ${session.records.filter(record => record.status !== 'excused').length}`,
    ...(!student ? [<Action label="Correct attendance" Icon={PenLine} onClick={() => dialog({ type: 'attendance', session })} />] : []),
  ]);
  const totals = attendanceStats(data.attendance, sections);
  return <>
    {student && <section className="surface report-card">
      <div className="section-header"><div><h2>Subject summary</h2><p>Late counts as attended. Excused classes are excluded.</p></div></div>
      <Table columns={['Course', 'Classes', 'Attended', 'Attendance']} rows={totals.map(row => [row.courseId, named(data.courses, row.courseId, 'title'), row.total, row.attended, row.percentage === null ? '—' : `${row.percentage}%`])} />
    </section>}
    <section className="surface table-surface">
      <div className="table-toolbar"><select aria-label="Filter by section" value={sectionId} onChange={event => setSectionId(event.target.value)}>{option('', 'All sections')}{data.sections.map(section => option(section.id, sectionLabel(data, section)))}</select>
        <input type="date" aria-label="Filter by date" value={date} onChange={event => setDate(event.target.value)} />
        {!student && <AddButton onClick={() => dialog({ type: 'attendance', sectionId })}>Mark attendance</AddButton>}
      </div>
      <Table columns={['Date', 'Time', 'Course', 'Section', student ? 'Status' : 'Attended', ...(!student ? ['Actions'] : [])]} rows={rows} empty="No attendance sessions match your filters." />
    </section>
  </>;
}

export function Announcements({ data, user, dialog, onOpen }) {
  const [filter, setFilter] = useState('');
  const notices = [...data.announcements].filter(entry => !filter || entry.audience === filter).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  return <section className="surface">
    <div className="table-toolbar">
      <select aria-label="Announcement audience" value={filter} onChange={event => setFilter(event.target.value)}>{option('', 'All audiences')}{Object.entries(audienceLabels).map(([value, label]) => option(value, label))}</select>
      {user.role !== 'student' && <AddButton onClick={() => dialog({ type: 'announcement' })}>New announcement</AddButton>}
    </div>
    {notices.map(notice => <article className="announcement-row" key={notice.id}>
      <span className={`tile-icon ${notice.category === 'Academic' ? 'violet' : 'green'}`}><Megaphone size={19} /></span>
      <div><div className="announcement-meta"><span className="badge">{audienceLabels[notice.audience]}</span><small>{notice.category} · {displayDate(notice.createdAt)}</small></div>
        <button type="button" className="notice-title" onClick={() => onOpen(notice)}>{notice.title}</button><p>{notice.body}</p></div>
      {(user.role === 'admin' || notice.authorId === user.id) && <div className="table-actions"><Action label="Edit announcement" Icon={PenLine} onClick={() => dialog({ type: 'announcement', entry: notice })} />
        <Action label="Delete announcement" Icon={Trash2} onClick={() => dialog({ type: 'delete', collection: 'announcements', entry: notice, title: notice.title })} /></div>}
    </article>)}
    {!notices.length && <p className="empty">No announcements for this audience.</p>}
  </section>;
}

export function Reports({ data, user, connected }) {
  const [threshold, setThreshold] = useState('75');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');
  const value = threshold === '' ? null : Number(threshold);
  const valid = Number.isFinite(value) && value >= 0 && value <= 100;
  useEffect(() => {
    if (!connected || !valid) return;
    let active = true;
    setMetrics(null);
    setError('');
    const timer = setTimeout(() => {
      Promise.all([
        campusApi.request(`/reports/attendance?threshold=${value}`),
        user.role === 'student' ? Promise.resolve([]) : campusApi.request('/reports/enrollment'),
      ]).then(([attendance, enrollment]) => {
        if (active) setMetrics({ attendance, enrollment });
      }).catch(failure => { if (active) setError(failure.message); });
    }, 220);
    return () => { active = false; clearTimeout(timer); };
  }, [connected, valid, value, data.attendance, data.enrollments, user.role]);
  const localAttendance = attendanceStats(data.attendance, data.sections);
  const attendance = connected ? metrics?.attendance || [] : localAttendance.map(row => ({ ...row, belowThreshold: row.percentage !== null && valid && row.percentage < value }));
  const enrollment = connected ? metrics?.enrollment || [] : data.sections.map(section => ({
    sectionId: section.id, courseId: section.courseId, name: section.name, term: section.term,
    count: data.enrollments.filter(entry => entry.sectionId === section.id).length,
  }));
  return <>
    <section className="surface report-card">
      <div className="section-header"><div><h2>Subject-wise attendance</h2><p>Attendance below your threshold is highlighted.</p></div><Field label="Threshold (%)"><input type="number" min="0" max="100" value={threshold} onChange={event => setThreshold(event.target.value)} /></Field></div>
      {!valid && <p className="error-banner" role="alert">Enter a threshold between 0 and 100.</p>}
      {error && <p className="error-banner" role="alert">{error}</p>}
      <Table columns={['Student', 'Course', 'Classes', 'Attended', 'Attendance']} empty={connected && !metrics && valid && !error ? 'Loading…' : 'No attendance to report.'}
        rows={attendance.map(row => [`${row.courseId}/${row.studentId}`, named(data.users, row.studentId), named(data.courses, row.courseId, 'title'), row.total, row.attended, <span className={`badge ${row.belowThreshold ? 'status-absent' : 'status-present'}`}>{row.percentage === null ? '—' : `${row.percentage}%`}</span>])} />
    </section>
    {user.role !== 'student' && <section className="surface report-card">
      <div className="section-header"><div><h2>Section enrolment</h2><p>Student counts by course and section.</p></div></div>
      <Table columns={['Course', 'Section', 'Term', 'Enrolled students']} rows={enrollment.map(row => [row.sectionId, named(data.courses, row.courseId, 'title'), row.name, row.term, row.count])} />
    </section>}
  </>;
}

export function Profile({ user, mutate, notify }) {
  return <section className="surface profile-card"><div className="section-header"><div className="person-cell"><span className="avatar">{initials(user.name)}</span><div><h2>{user.name}</h2><p>{roleLabels[user.role]} · {user.code}</p></div></div></div>
    <Form onSave={async fields => { await mutate('profile', 'PATCH', { name: fields.name }); notify('Profile updated'); }} submitLabel="Save profile">
      <Field label="Full name"><input name="name" defaultValue={user.name} required maxLength={100} /></Field>
      <Field label="Email"><input defaultValue={user.email} readOnly /></Field>
      <Field label="Department"><input defaultValue={user.department} readOnly /></Field>
    </Form>
  </section>;
}

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const node = ref.current;
    node.showModal();
    return () => node.close();
  }, []);
  return <dialog className="modal" ref={ref} aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => {
    if (event.target === ref.current) {
      const box = ref.current.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
    }
  }}><div className="modal-header"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></div><div className="modal-body">{children}</div></dialog>;
}

function Form({ children, onSave, onClose, submitLabel = 'Save changes', danger = false, disabled = false }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return <form className="workspace-form" onSubmit={async event => {
    event.preventDefault();
    if (busy || disabled) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setError('');
    setBusy(true);
    try { await onSave(fields); } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }}>
    {children}
    {error && <p className="error-banner" role="alert">{error}</p>}
    <div className="form-actions">{onClose && <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>}
      <button type="submit" className={danger ? 'danger-button' : 'primary-button'} disabled={busy || disabled}>{busy ? 'Saving…' : submitLabel}</button></div>
  </form>;
}

export function SignIn({ onClose, onSignIn }) {
  return <Modal title="Sign in to campus API" onClose={onClose}>
    <p className="dialog-copy">Use an account from the connected campus database. You can explore sample records from the profile menu.</p>
    <Form onSave={onSignIn} submitLabel="Sign in" onClose={onClose}>
      <Field label="Email"><input type="email" name="email" required autoComplete="username" /></Field>
      <Field label="Password"><input type="password" name="password" required autoComplete="current-password" /></Field>
    </Form>
  </Modal>;
}

export function WorkspaceDialog({ config, onClose, data, user, mutate, notify, connected }) {
  async function save(collection, method, fields, id) {
    await mutate(collection, method, fields, id);
    onClose();
    notify(method === 'DELETE' ? 'Record deleted' : method === 'POST' ? 'Record added' : 'Changes saved');
  }

  if (config.type === 'edit') {
    const { page, entry } = config;
    const cfg = directoryConfig[page];
    return <Modal title={`${entry ? 'Edit' : 'Add'} ${cfg.label.toLowerCase()}`} onClose={onClose}>
      <Form onClose={onClose} onSave={fields => {
        if (cfg.collection === 'users') {
          if (!entry) fields.role = page === 'students' ? 'student' : 'faculty';
          if (!fields.password) delete fields.password;
        }
        if (page === 'courses') fields.credits = Number(fields.credits);
        return save(cfg.collection, entry ? 'PATCH' : 'POST', fields, entry?.id);
      }}>
        {cfg.collection === 'users' && <>
          <Field label="Full name"><input name="name" defaultValue={entry?.name} required maxLength={100} /></Field>
          <Field label="Email"><input type="email" name="email" defaultValue={entry?.email} required /></Field>
          <Field label={page === 'students' ? 'Student ID' : 'Staff ID'}><input name="code" defaultValue={entry?.code} required maxLength={24} /></Field>
          {connected && !entry && <Field label="Initial password"><input type="password" name="password" required minLength={10} maxLength={72} autoComplete="new-password" /></Field>}
        </>}
        {page === 'courses' && <>
          <Field label="Course title"><input name="title" defaultValue={entry?.title} required maxLength={120} /></Field>
          <Field label="Course code"><input name="code" defaultValue={entry?.code} required maxLength={24} /></Field>
          <Field label="Credits"><input type="number" name="credits" defaultValue={entry?.credits || 3} required min={1} max={30} /></Field>
        </>}
        {page !== 'sections' ? <Field label="Department"><select name="department" defaultValue={entry?.department || ''} required>{option('', 'Select a department')}{[...new Set([...departments, ...(entry?.department ? [entry.department] : [])])].map(value => option(value))}</select></Field>
          : <>
            <Field label="Section name"><input name="name" defaultValue={entry?.name} required maxLength={48} /></Field>
            <Field label="Term"><input name="term" defaultValue={entry?.term} placeholder="Autumn 2026" required maxLength={48} /></Field>
            <Field label="Course"><select name="courseId" defaultValue={entry?.courseId || ''} required>{option('', 'Select a course')}{data.courses.map(course => option(course.id, `${course.code} · ${course.title}`))}</select></Field>
            <Field label="Assigned faculty"><select name="facultyId" defaultValue={entry?.facultyId || ''} required>{option('', 'Select faculty')}{data.users.filter(account => account.role === 'faculty').map(account => option(account.id, account.name))}</select></Field>
          </>}
      </Form>
    </Modal>;
  }
  if (config.type === 'attendance') return <AttendanceDialog config={config} data={data} onClose={onClose} save={save} />;
  if (config.type === 'announcement') return <AnnouncementDialog user={user} entry={config.entry} data={data} onClose={onClose} save={save} />;
  if (config.type === 'delete') return <Modal title="Delete record" onClose={onClose}>
    <Form submitLabel="Delete record" danger onClose={onClose} onSave={() => save(config.collection, 'DELETE', undefined, config.entry.id)}>
      <p className="dialog-copy">Delete <strong>{config.title}</strong> from this workspace?</p>
    </Form>
  </Modal>;
  if (config.type === 'roster') return <RosterDialog section={config.section} onClose={onClose} data={data} user={user} mutate={mutate} notify={notify} />;
  if (config.type === 'notice') return <Modal title={config.notice.title} onClose={onClose}>
    <div className="announcement-meta"><span className="badge">{audienceLabels[config.notice.audience]}</span><small>{displayDate(config.notice.createdAt)}</small></div>
    <p className="dialog-copy notice-body">{config.notice.body}</p>
  </Modal>;
  if (config.type === 'course') return <Modal title={config.course.title} onClose={onClose}>
    <p className="dialog-copy">{config.course.code} · {config.course.department} · {config.course.credits} credits</p>
    <Table columns={['Section', 'Term', 'Faculty']} rows={data.sections.filter(section => section.courseId === config.course.id).map(section => [section.id, section.name, section.term, named(data.users, section.facultyId)])} empty="No sections available." />
  </Modal>;
  return <Modal title="Workspace guide" onClose={onClose}><div className="guide">
    <p><CircleHelp size={18} /> Select a landmark from the aerial view or open the 3D model to orbit and zoom around campus.</p>
    <p><Users size={18} /> The sample workspace keeps changes in this browser. Use the profile menu to try administrator, faculty and student views.</p>
    <p><ClipboardList size={18} /> Open a section to view its roster. Administrators can enrol students there.</p>
  </div></Modal>;
}

function RosterDialog({ section, data, user, onClose, mutate, notify }) {
  const [remove, setRemove] = useState(null);
  const entries = data.enrollments.filter(entry => entry.sectionId === section.id);
  const available = data.users.filter(account => account.role === 'student' && entries.every(entry => entry.studentId !== account.id));
  const admin = user.role === 'admin';
  return <Modal title={`${section.name} roster`} onClose={onClose}>
    <p className="dialog-copy">{sectionLabel(data, section)}</p>
    <Table columns={['Student', 'ID', ...(admin ? ['Actions'] : [])]} rows={entries.map(entry => [
      entry.id, named(data.users, entry.studentId), named(data.users, entry.studentId, 'code'), ...(admin ? [
        <Action label={`Remove ${named(data.users, entry.studentId)} from section`} Icon={Trash2} onClick={() => setRemove(entry)} />,
      ] : []),
    ])} empty="No students enrolled." />
    {remove && <Form submitLabel="Remove enrolment" danger onClose={() => setRemove(null)} onSave={async () => {
      await mutate('enrollments', 'DELETE', undefined, remove.id); setRemove(null); notify('Enrolment removed');
    }}><p className="dialog-copy">Remove {named(data.users, remove.studentId)} from this section?</p></Form>}
    {admin && !remove && <Form submitLabel="Enrol student" disabled={!available.length} onSave={async fields => {
      await mutate('enrollments', 'POST', { ...fields, sectionId: section.id }); notify('Student enrolled');
    }}><Field label="Enrol a student"><select name="studentId" required defaultValue="">{option('', available.length ? 'Select a student' : 'No available students')}{available.map(account => option(account.id, account.name))}</select></Field></Form>}
  </Modal>;
}

function AttendanceDialog({ config, data, onClose, save }) {
  const session = config.session;
  const [sectionId, setSectionId] = useState(session?.sectionId || config.sectionId || '');
  const roster = session ? session.records.map(record => record.studentId) : data.enrollments.filter(entry => entry.sectionId === sectionId).map(entry => entry.studentId);
  return <Modal title={session ? 'Correct attendance' : 'Mark attendance'} onClose={onClose}>
    <Form key={sectionId} submitLabel="Save attendance" onClose={onClose} disabled={!roster.length} onSave={fields => {
      const records = roster.map(studentId => ({ studentId, status: fields[`status:${studentId}`] }));
      return save('attendance', session ? 'PATCH' : 'POST', session
        ? { records, reason: fields.reason, revision: session.revision }
        : { records, sectionId, date: fields.date, slot: fields.slot }, session?.id);
    }}>
      <Field label="Section"><select value={sectionId} disabled={!!session} required onChange={event => setSectionId(event.target.value)}>{option('', 'Select a section')}{data.sections.map(section => option(section.id, sectionLabel(data, section)))}</select></Field>
      {!session ? <div className="form-two"><Field label="Class date"><input type="date" name="date" defaultValue={indiaDate()} max={indiaDate()} required /></Field><Field label="Start time"><input type="time" name="slot" defaultValue="09:00" required /></Field></div>
        : <p className="dialog-copy">{displayDate(session.date)} · {session.slot}</p>}
      {roster.map(studentId => <Field key={studentId} label={named(data.users, studentId)}>
        <select name={`status:${studentId}`} defaultValue={session?.records.find(record => record.studentId === studentId)?.status || 'present'}>
          {Object.entries(statusLabels).map(([value, label]) => option(value, label))}
        </select>
      </Field>)}
      {(!roster.length && sectionId) && <p className="dialog-copy">Enrol students in this section before marking attendance.</p>}
      {session && <Field label="Correction reason"><textarea name="reason" minLength={5} maxLength={300} required /></Field>}
    </Form>
  </Modal>;
}

function AnnouncementDialog({ entry, user, data, onClose, save }) {
  const [audience, setAudience] = useState(entry?.audience || (user.role === 'admin' ? 'university' : 'section'));
  const ownedSections = user.role === 'faculty' ? data.sections.filter(section => section.facultyId === user.id) : data.sections;
  return <Modal title={entry ? 'Edit announcement' : 'New announcement'} onClose={onClose}>
    <Form onClose={onClose} submitLabel={entry ? 'Save changes' : 'Publish'} onSave={fields => {
      if (fields.audience === 'university') fields.targetId = null;
      return save('announcements', entry ? 'PATCH' : 'POST', fields, entry?.id);
    }}>
      <Field label="Title"><input name="title" defaultValue={entry?.title} maxLength={140} required /></Field>
      <Field label="Category"><select name="category" defaultValue={entry?.category || 'Academic'}>{['Academic', 'Campus', 'Event'].map(value => option(value))}</select></Field>
      <Field label="Audience"><select name="audience" value={audience} onChange={event => setAudience(event.target.value)}>
        {Object.entries(audienceLabels).filter(([key]) => user.role === 'admin' || key !== 'university').map(([key, label]) => option(key, label))}
      </select></Field>
      {audience !== 'university' && <Field label={audienceLabels[audience]}><select key={audience} name="targetId" defaultValue={entry?.audience === audience ? entry.targetId : ''} required>
        {option('', `Select a ${audience}`)}{audience === 'section' ? ownedSections.map(section => option(section.id, sectionLabel(data, section)))
          : data.courses.filter(course => ownedSections.some(section => section.courseId === course.id)).map(course => option(course.id, `${course.code} · ${course.title}`))}
      </select></Field>}
      <Field label="Message"><textarea name="body" defaultValue={entry?.body} rows={5} maxLength={2500} required /></Field>
    </Form>
  </Modal>;
}
