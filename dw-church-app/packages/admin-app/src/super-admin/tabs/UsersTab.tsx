import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../components';
import { useAdminApi } from '../shared/use-admin-api';
import { Spinner, EmptyState } from '../shared/admin-ui';
import { formatDate } from '../shared/format';
import type { User } from '../shared/types';

// ─── User Role Change Modal ──────────────────────────────
function RoleChangeModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(user.role);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role }),
      });
      showToast('success', '역할이 변경되었습니다.');
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '역할 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">역할 변경</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Password Reset Modal ────────────────────────────────
function PasswordResetModal({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('error', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPassword }),
      });
      showToast('success', '비밀번호가 변경되었습니다.');
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '비밀번호 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">비밀번호 리셋</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Tenant Transfer Modal ───────────────────────────────
function TenantTransferModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantId] = useState(user.tenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm(`"${user.name}"의 테넌트를 변경하시겠습니까?`)) return;
    setLoading(true);
    try {
      await apiFetch(`/users/${user.id}/tenant`, {
        method: 'PUT',
        body: JSON.stringify({ tenantId }),
      });
      showToast('success', '테넌트가 변경되었습니다.');
      onSaved();
      onClose();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '테넌트 변경 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">테넌트 변경</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{user.name} ({user.email})</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">새 테넌트 ID</label>
            <input
              required
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="tenant-uuid"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '변경 중...' : '변경'}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── Create User Modal ───────────────────────────────────
// Super admin adds a user directly. Tenant binding is optional (super_admin
// users may have none). If no password is entered the server generates a
// temporary one and returns it ONCE — we surface it so the operator can hand
// it over; it is never stored in plain text.
function CreateUserModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('editor');
  const [tenantSlug, setTenantSlug] = useState('');
  const [password, setPassword] = useState('');
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) {
      showToast('error', '이메일과 이름은 필수입니다.');
      return;
    }
    if (password && password.length < 8) {
      showToast('error', '비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch<{ tempPassword?: string }>('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          role,
          tenantSlug: tenantSlug.trim() || undefined,
          password: password || undefined,
        }),
      });
      onSaved();
      if (res?.tempPassword) {
        // Keep the modal open to display the generated password once.
        setTempPassword(res.tempPassword);
        showToast('success', '사용자가 생성되었습니다. 임시 비밀번호를 전달하세요.');
      } else {
        showToast('success', '사용자가 생성되었습니다.');
        onClose();
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '사용자 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">사용자 추가</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {tempPassword ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              사용자가 생성되었습니다. 아래 임시 비밀번호를 사용자에게 전달하세요.
              <br />
              <span className="text-amber-600">이 비밀번호는 다시 표시되지 않습니다.</span>
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 font-mono text-sm text-gray-900 select-all break-all">
              {tempPassword}
            </div>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(tempPassword).catch(() => {});
                showToast('success', '복사되었습니다.');
              }}
              className="w-full bg-gray-100 py-2 rounded-lg text-sm hover:bg-gray-200 transition-colors"
            >
              비밀번호 복사
            </button>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              완료
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이메일 *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">역할</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="member">Member</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                교회(테넌트) slug <span className="text-gray-400">— 선택</span>
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="예: grace-church (비워두면 미지정)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                비밀번호 <span className="text-gray-400">— 비우면 자동 생성</span>
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="최소 8자 (선택)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '생성 중...' : '생성'}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors">
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function UsersTab() {
  const apiFetch = useAdminApi();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [roleChangeUser, setRoleChangeUser] = useState<User | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<User | null>(null);
  const [tenantTransferUser, setTenantTransferUser] = useState<User | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch<{ data: User[]; total: number } | User[]>('/users');
      setUsers(Array.isArray(res) ? res : res.data ?? []);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '사용자 목록 로딩 실패');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, showToast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleToggleLock = async (user: User) => {
    const action = user.isLocked ? '해제' : '잠금';
    if (!window.confirm(`"${user.name}" 사용자를 ${action}하시겠습니까?`)) return;
    try {
      const endpoint = user.isLocked ? 'unlock' : 'lock';
      await apiFetch(`/users/${user.id}/${endpoint}`, { method: 'PUT' });
      showToast('success', `${action}되었습니다.`);
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (user.role === 'super_admin') {
      showToast('error', 'Super Admin은 비활성화할 수 없습니다.');
      return;
    }
    const action = user.isActive ? '비활성화' : '활성화';
    if (!window.confirm(`"${user.name}" 사용자를 ${action}하시겠습니까?`)) return;
    try {
      await apiFetch(`/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      showToast('success', `${action}되었습니다.`);
      void fetchUsers();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : `${action} 실패`);
    }
  };

  const filteredUsers = search
    ? users.filter(
        (u) =>
          u.email.toLowerCase().includes(search.toLowerCase()) ||
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.tenantName.toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="이메일, 이름, 교회명으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-72 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-xs text-gray-400 hover:text-gray-600">
            초기화
          </button>
        )}
        <button
          onClick={() => setShowCreateUser(true)}
          className="ml-auto inline-flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <span>＋</span> 사용자 추가
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <Spinner />
        ) : filteredUsers.length === 0 ? (
          <EmptyState message={search ? '검색 결과가 없습니다.' : '사용자가 없습니다.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 font-medium text-xs">
                  <th className="px-5 py-3">이메일</th>
                  <th className="px-5 py-3">이름</th>
                  <th className="px-5 py-3">역할</th>
                  <th className="px-5 py-3">교회명</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">생성일</th>
                  <th className="px-5 py-3">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u, idx) => (
                  <tr key={u.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-5 py-3 text-gray-900">{u.email}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${roleColors[u.role] || 'bg-gray-100'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{u.tenantName}</td>
                    <td className="px-5 py-3">
                      {u.role === 'super_admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          활성
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            u.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                          {u.isActive ? '활성' : '비활성'}
                        </button>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setRoleChangeUser(u)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          역할변경
                        </button>
                        <button
                          onClick={() => setPasswordResetUser(u)}
                          className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          비밀번호리셋
                        </button>
                        <button
                          onClick={() => handleToggleLock(u)}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            u.isLocked ? 'text-green-600 hover:bg-green-50' : 'text-amber-600 hover:bg-amber-50'
                          }`}
                        >
                          {u.isLocked ? '해제' : '잠금'}
                        </button>
                        <button
                          onClick={() => setTenantTransferUser(u)}
                          className="px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded transition-colors"
                        >
                          테넌트변경
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateUser && (
        <CreateUserModal
          onClose={() => setShowCreateUser(false)}
          onSaved={() => void fetchUsers()}
        />
      )}
      {roleChangeUser && (
        <RoleChangeModal
          user={roleChangeUser}
          onClose={() => setRoleChangeUser(null)}
          onSaved={() => void fetchUsers()}
        />
      )}
      {passwordResetUser && (
        <PasswordResetModal
          user={passwordResetUser}
          onClose={() => setPasswordResetUser(null)}
        />
      )}
      {tenantTransferUser && (
        <TenantTransferModal
          user={tenantTransferUser}
          onClose={() => setTenantTransferUser(null)}
          onSaved={() => void fetchUsers()}
        />
      )}
    </div>
  );
}

// ─── Tab: Migration — imported from MigrationTab.tsx ──────
