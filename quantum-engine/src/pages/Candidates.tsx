import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Building2, MapPin, User, Briefcase, X, ChevronLeft, ChevronRight, Globe, Mail, Users } from 'lucide-react';
import { fetchGoldCompanies } from '../api/companies';
import { GoldCompany, GoldCompanyFilters } from '../types';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const color =
    status === '存续' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    status === '注销' ? 'text-red-700 bg-red-50 border-red-200' :
    status === '吊销' ? 'text-orange-700 bg-orange-50 border-orange-200' :
    'text-slate-600 bg-slate-100 border-slate-200';
  return (
    <span className={`inline-flex items-center text-[11px] border rounded-md px-1.5 py-0.5 font-medium ${color}`}>
      {status}
    </span>
  );
}

function CompanyCard({ company }: { company: GoldCompany }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full text-left px-5 py-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[15px] font-semibold text-slate-800 truncate">{company.name}</span>
              <StatusBadge status={company.reg_status} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-slate-500">
              {company.province && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {company.city ?? company.province}
                </span>
              )}
              {company.legal_person_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 shrink-0" />
                  {company.legal_person_name}
                </span>
              )}
              {company.industry && (
                <span className="flex items-center gap-1">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  {company.industry}
                </span>
              )}
              {company.reg_capital && (
                <span>注册 {company.reg_capital}</span>
              )}
              {company.actual_capital && (
                <span>实缴 {company.actual_capital}</span>
              )}
              {company.social_staff_num != null && String(company.social_staff_num) !== '0' && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 shrink-0" />{company.social_staff_num} 人
                </span>
              )}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">
            {company.establish_time ? `成立于 ${company.establish_time}` : ''}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-3 bg-slate-50/60 rounded-b-xl">
          {/* 基本信息网格 */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
            {company.alias && (
              <div className="col-span-2"><span className="text-slate-500">曾用名 </span><span className="text-slate-700">{company.alias}</span></div>
            )}
            {company.credit_code && (
              <div className="col-span-2"><span className="text-slate-500">统一社会信用代码 </span><span className="font-mono text-slate-700">{company.credit_code}</span></div>
            )}
            {company.company_type && (
              <div><span className="text-slate-500">企业类型 </span><span className="text-slate-700">{company.company_type}</span></div>
            )}
            {company.scale && (
              <div><span className="text-slate-500">规模 </span><span className="text-slate-700">{company.scale}</span></div>
            )}
            {company.reg_capital && (
              <div><span className="text-slate-500">注册资本 </span><span className="text-slate-700">{company.reg_capital}</span></div>
            )}
            {company.actual_capital && (
              <div><span className="text-slate-500">实缴资本 </span><span className="text-slate-700">{company.actual_capital}</span></div>
            )}
            {company.social_staff_num != null && (
              <div><span className="text-slate-500">员工人数 </span><span className="text-slate-700">{company.social_staff_num} 人</span></div>
            )}
            {company.establish_time && (
              <div><span className="text-slate-500">成立日期 </span><span className="text-slate-700">{company.establish_time}</span></div>
            )}
            {company.reg_location && (
              <div className="col-span-2"><span className="text-slate-500">注册地址 </span><span className="text-slate-700">{company.reg_location}</span></div>
            )}
          </div>
          {/* 联系方式 */}
          {(company.website || company.email) && (
            <div className="flex flex-wrap gap-3">
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `http://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />{company.website}
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-800 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />{company.email}
                </a>
              )}
            </div>
          )}
          {/* 经营范围 */}
          {company.business_scope && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">经营范围</p>
              <p className="text-[12px] text-slate-700 leading-relaxed line-clamp-4">{company.business_scope}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Candidates() {
  const [items, setItems] = useState<GoldCompany[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const [name, setName] = useState('');
  const [province, setProvince] = useState('');
  const [industry, setIndustry] = useState('');
  const [regStatus, setRegStatus] = useState('');
  // 提交的搜索词（按Enter或点击搜索后生效）
  const [committedName, setCommittedName] = useState('');

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const load = useCallback(async (filters: GoldCompanyFilters) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchGoldCompanies(filters);
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ page, page_size: PAGE_SIZE, name: committedName || undefined, province: province || undefined, industry: industry || undefined, reg_status: regStatus || undefined });
  }, [page, committedName, province, industry, regStatus, load]);

  // 前端按成立时间排序
  const sortedItems = [...items].sort((a, b) => {
    const ta = a.establish_time ?? '';
    const tb = b.establish_time ?? '';
    return sortOrder === 'desc' ? tb.localeCompare(ta) : ta.localeCompare(tb);
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleSearch = () => {
    setPage(1);
    setCommittedName(name);
  };

  const clearFilters = () => {
    setName('');
    setCommittedName('');
    setProvince('');
    setIndustry('');
    setRegStatus('');
    setPage(1);
  };

  const hasFilters = committedName || province || industry || regStatus;

  return (
    <div>
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">COMPANY DB</h1>
        <p className="text-[#8892aa] text-sm">
          量子赛道公司库 · 共 <span className="text-blue-400 font-medium">{loading ? '…' : total}</span> 家企业
        </p>
      </div>

      {/* Search bar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="搜索公司名称…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 transition-all text-[13px]"
            />
            {name && (
              <button onClick={() => setName('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            搜索
          </button>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2 mt-3">
          <select
            value={province}
            onChange={e => { setProvince(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">全部省份</option>
            {['北京市','上海市','广东省','江苏省','浙江省','安徽省','湖北省','四川省','陕西省','山东省','河南省','福建省','湖南省'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={regStatus}
            onChange={e => { setRegStatus(e.target.value); setPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">全部状态</option>
            <option value="存续">存续</option>
            <option value="注销">注销</option>
            <option value="吊销">吊销</option>
          </select>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] text-slate-700 focus:outline-none focus:border-blue-400"
          >
            <option value="desc">成立时间 ↓ 新→旧</option>
            <option value="asc">成立时间 ↑ 旧→新</option>
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-[12px] text-slate-600 hover:text-slate-800 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              清除筛选
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 px-4 py-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl">
          加载失败：{error}
        </div>
      )}

      {/* List */}
      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-500">
          <Building2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">未找到匹配企业</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map(c => <CompanyCard key={c.id} company={c} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <span className="text-[12px] text-slate-500">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              下一页<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
