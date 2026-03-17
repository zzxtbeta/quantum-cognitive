import { Candidate } from '../types';

export const mockCandidates: Candidate[] = [
  {
    id: 'candidate-1',
    name: '本源量子',
    location: '合肥',
    techRoute: '超导量子计算',
    signalCount: 3,
    reasons: ['近期信号密集', '团队背景强', '融资进展快'],
    stage: '工程化早期',
    fundingRound: 'C轮',
    description: '专注超导量子计算路线，已推出多款量子计算机原型机',
  },
  {
    id: 'candidate-2',
    name: '启科量子',
    location: '北京',
    techRoute: '量子通信',
    signalCount: 2,
    reasons: ['技术路线新兴', '政策支持明确'],
    stage: '工程化',
    fundingRound: 'A轮',
    description: '主要从事量子通信设备研发',
  },
  {
    id: 'candidate-3',
    name: '国盾量子',
    location: '合肥',
    techRoute: '量子通信',
    signalCount: 5,
    reasons: ['已上市', '市场占有率高', '技术积累深厚'],
    stage: '商业化',
    fundingRound: '上市',
    description: '国内量子通信领域龙头企业',
  },
];
