/**
 * 论文数据适配器 - 将后端API响应转换为前端Signal类型
 */

import { Signal, SignalDetail } from '../types';
import { BackendPaper } from '../types/backend';

// 清理标题中的HTML/MathML标签
function cleanTitle(title: string): string {
  // 移除所有XML/HTML标签
  return title.replace(/<[^>]*>/g, '').trim();
}

export function adaptPaperToSignal(paper: BackendPaper): Signal {
  // 构建摘要：优先使用research_problem的summary，否则截取abstract
  const summary = paper.research_problem?.summary 
    || (paper.abstract.length > 200 ? paper.abstract.substring(0, 200) + '...' : paper.abstract);

  // 计算关联实体数量（基于论文数据推断）
  const relatedEntities = {
    companies: 0, // 论文暂无公司信息
    people: paper.authors.length,
    technologies: paper.domain_ids.length,
  };

  // 根据影响力分数或发表时间判断优先级
  let priority: 'high' | 'mid' | 'low' = 'mid';
  if (paper.influence_score) {
    if (paper.influence_score >= 80) priority = 'high';
    else if (paper.influence_score < 60) priority = 'low';
  } else {
    // 如果没有影响力分数，根据发表时间判断（最近的优先级高）
    const publishDate = new Date(paper.publish_date);
    const now = new Date();
    const daysDiff = (now.getTime() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff < 90) priority = 'high';
    else if (daysDiff > 365) priority = 'low';
  }

  return {
    id: `paper-${paper.id}`,
    title: cleanTitle(paper.title),
    type: '论文',
    source: paper.authors[0]?.affiliation || 'Unknown',
    timestamp: paper.publish_date,
    priority,
    summary,
    relatedEntities,
  };
}

export function adaptPaperToSignalDetail(paper: BackendPaper): SignalDetail {
  const signal = adaptPaperToSignal(paper);

  // 构建"为什么重要"列表
  const whyImportant: string[] = [];
  if (paper.research_problem?.summary) {
    whyImportant.push(`研究问题：${paper.research_problem.summary}`);
  }
  if (paper.tech_route?.summary) {
    whyImportant.push(`技术路线：${paper.tech_route.summary}`);
  }
  if (paper.key_contributions && paper.key_contributions.length > 0) {
    paper.key_contributions.forEach(contrib => {
      if (contrib.summary) {
        whyImportant.push(`关键贡献：${contrib.summary}`);
      }
    });
  }
  if (whyImportant.length === 0) {
    whyImportant.push(`${paper.authors.length}位作者参与研究`);
    whyImportant.push(`涉及${paper.domain_ids.length}个技术领域`);
  }

  return {
    ...signal,
    whyImportant,
    // 保存原始论文数据用于详情展示
    metadata: {
      paper_id: paper.paper_id,
      abstract: paper.abstract,
      authors: paper.authors,
      research_problem: paper.research_problem,
      tech_route: paper.tech_route,
      key_contributions: paper.key_contributions,
      metrics: paper.metrics,
      domain_ids: paper.domain_ids,
      influence_score: paper.influence_score,
    },
  };
}

export function adaptPapersResponse(papers: BackendPaper[]): Signal[] {
  return papers.map(adaptPaperToSignal);
}
