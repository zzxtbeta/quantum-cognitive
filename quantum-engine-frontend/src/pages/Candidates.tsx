import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Mail,
  MapPin,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react';
import { fetchCompanies } from '../api/companies';
import { Company, CompanyFilters } from '../types';

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const tone =
    status === '存续' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' :
    status === '注销' ? 'text-red-700 bg-red-50 border-red-200' :
    status === '吊销' ? 'text-orange-700 bg-orange-50 border-orange-200' :
    'text-slate-600 bg-slate-100 border-slate-200';

  return (
    <span className={`inline-flex items-center text-[11px] border rounded-md px-1.5 py-0.5 font-medium ${tone}`}>
      {status}
    </span>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="text-[12px]">
      <span className="text-slate-500">{label} </span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <button onClick={() => setExpanded((v) => !v)} className="w-full text-left px-5 py-4">
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
                  {[company.province, company.city, company.district].filter(Boolean).join(' / ')}
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
              {company.reg_capital && <span>注册资本 {company.reg_capital}</span>}
            </div>
          </div>
          <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">
            {company.establish_time ? `成立于 ${company.establish_time}` : ''}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4 bg-slate-50/70 rounded-b-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <InfoItem label="统一社会信用代码" value={company.credit_code} />
            <InfoItem label="企业类型" value={company.company_type} />
            <InfoItem label="法定代表人" value={company.legal_person_name} />
            <InfoItem label="规模" value={company.scale} />
            <InfoItem label="注册资本" value={company.reg_capital} />
            <InfoItem label="实缴资本" value={company.actual_capital} />
            <InfoItem label="员工人数" value={company.social_staff_num != null ? `${company.social_staff_num} 人` : null} />
            <InfoItem label="成立日期" value={company.establish_time} />
            <div className="md:col-span-2">
              <InfoItem label="注册地址" value={company.reg_location} />
            </div>
          </div>

          {(company.website || company.email) && (
            <div className="flex flex-wrap gap-3">
              {company.website && (
                <a
                  href={company.website.startsWith('http') ? company.website : `http://${company.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 hover:underline"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {company.website}
                </a>
              )}
              {company.email && (
                <a
                  href={`mailto:${company.email}`}
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-800 hover:underline"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {company.email}
                </a>
              )}
            </div>
          )}

          {company.business_scope && (
            <div>
              <p className="text-[11px] text-slate-500 uppercase tracking-widest mb-1">经营范围</p>
              <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                {company.business_scope}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Candidates() {
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [draftName, setDraftName] = useState('');
  const [draftLegalPerson, setDraftLegalPerson] = useState('');
  const [draftProvince, setDraftProvince] = useState('');
  const [draftIndustry, setDraftIndustry] = useState('');
  const [draftRegStatus, setDraftRegStatus] = useState('');

  const [committedFilters, setCommittedFilters] = useState<Pick<
    CompanyFilters,
    'name' | 'legal_person' | 'province' | 'industry' | 'reg_status'
  >>({});

  const load = useCallback(async (filters: CompanyFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCompanies(filters);
      setItems(response.items);
      setTotal(response.total);
    } catch (e: any) {
      setError(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({
      page,
      page_size: pageSize,
      ...committedFilters,
    });
  }, [page, pageSize, committedFilters, load]);

  const handleSearch = () => {
    setPage(1);
    setCommittedFilters({
      name: draftName || undefined,
      legal_person: draftLegalPerson || undefined,
      province: draftProvince || undefined,
      industry: draftIndustry || undefined,
      reg_status: draftRegStatus || undefined,
    });
  };

  const clearFilters = () => {
    setDraftName('');
    setDraftLegalPerson('');
    setDraftProvince('');
    setDraftIndustry('');
    setDraftRegStatus('');
    setCommittedFilters({});
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = Object.values(committedFilters).some(Boolean);

  const stats = useMemo(() => {
    const activeCount = items.filter((item) => item.reg_status === '存续').length;
    const withWebsite = items.filter((item) => item.website).length;
    const withCapital = items.filter((item) => item.reg_capital).length;
    return { activeCount, withWebsite, withCapital };
  }, [items]);

  return (
    <div>
      <div className="mb-6 animate-fade-up">
        <h1 className="font-display text-4xl text-shimmer tracking-widest mb-1">COMPANY DB</h1>
        <p className="text-[#8892aa] text-sm">
          量子赛道公司库 · 共 <span className="text-blue-400 font-medium">{loading ? '…' : total}</span> 家企业
        </p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{total || '—'}</p>
          <p className="text-[12px] text-slate-500 mt-1">当前筛选结果总量</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{stats.activeCount}</p>
          <p className="text-[12px] text-slate-500 mt-1">本页存续企业</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{stats.withWebsite}</p>
          <p className="text-[12px] text-slate-500 mt-1">含官网链接</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-2xl font-bold text-slate-800">{stats.withCapital}</p>
          <p className="text-[12px] text-slate-500 mt-1">含资本字段</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 mb-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="公司名称（模糊匹配）"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 text-[13px]"
            />
          </div>
          <input
            type="text"
            placeholder="法定代表人（模糊匹配）"
            value={draftLegalPerson}
            onChange={(e) => setDraftLegalPerson(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 text-[13px]"
          />
          <input
            type="text"
            placeholder="省份（精确匹配）"
            value={draftProvince}
            onChange={(e) => setDraftProvince(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 text-[13px]"
          />
          <input
            type="text"
            placeholder="行业（精确匹配）"
            value={draftIndustry}
            onChange={(e) => setDraftIndustry(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={draftRegStatus}
            onChange={(e) => setDraftRegStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-700 focus:outline-none focus:border-blue-400"
          >
            <option value="">全部登记状态</option>
            <option value="存续">存续</option>
            <option value="注销">注销</option>
            <option value="吊销">吊销</option>
          </select>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[13px] font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            搜索
          </button>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] text-slate-600 hover:text-slate-800 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              清除筛选
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 px-4 py-3 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-2xl">
          加载失败：{error}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          加载中…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-slate-500 bg-white border border-slate-200 rounded-2xl">
          <Building2 className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">未找到匹配企业</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((company) => <CompanyCard key={company.id} company={company} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <span className="text-[12px] text-slate-500">
            第 {page} / {totalPages} 页 · 共 {total} 条
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              上一页
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[12px] bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              下一页
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
