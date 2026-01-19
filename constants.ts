import { Category } from './types';

export const CATEGORIES: Category[] = ['VM', 'Hardware', 'Performance', 'Resources'];

export const FIELD_DEFINITIONS: Record<Category, { key: string; label: string }[]> = {
  VM: [
    { key: 'clusterName', label: 'Cluster Name' },
    { key: 'name', label: 'VM Name' },
    { key: 'uuid', label: 'UUID' },
    { key: 'powerState', label: 'Power State' },
    { key: 'macAddress', label: 'MAC Address' },
    { key: 'ipAddresses', label: 'IP Addresses' },
    { key: 'vDisk', label: 'vDisk' },
    { key: 'numVcpus', label: 'vCPUs' },
    { key: 'memoryMb', label: 'Memory (MB)' },
  ],
  Hardware: [
    { key: 'hostName', label: 'Host Name' },
    { key: 'serial', label: 'Serial' },
    { key: 'model', label: 'Model' },
    { key: 'cpuModel', label: 'CPU Model' },
    { key: 'numCores', label: 'Cores' },
    { key: 'memoryCapacity', label: 'Memory (GB)' },
    { key: 'blockSerial', label: 'Block Serial' },
    { key: 'disk', label: 'Disk' },
    { key: 'diskModel', label: 'Disk Model' },
  ],
  Performance: [
    { key: 'entityName', label: 'Entity Name' },
    { key: 'iops', label: 'IOPS' },
    { key: 'latency', label: 'Latency (ms)' },
    { key: 'bandwidth', label: 'Bandwidth' },
    { key: 'cpuUsage', label: 'CPU Usage (%)' },
    { key: 'memoryUsage', label: 'Memory Usage (%)' },
  ],
  Resources: [
    { key: 'hostName', label: 'Host name' },
    { key: 'vmCount', label: 'VM Count' },
    { key: 'numaOver', label: 'NUMA over' },
    { key: 'metric1', label: 'Metric 1' },
    { key: 'metric2', label: 'Metric 2' },
    { key: 'metric3', label: 'Metric 3' },
    { key: 'metric4', label: 'Metric 4' },
    { key: 'result', label: 'Result' },
  ],
};

export const DEFAULT_FIELDS: Record<Category, string[]> = {
  VM: ['clusterName', 'name', 'powerState'],
  Hardware: ['hostName', 'serial', 'model', 'cpuModel','numCores','memoryCapacity','disk'],
  Performance: ['entityName', 'iops', 'bandwidth', 'latency', 'cpuUsage', 'memoryUsage'],
  Resources: ['hostName', 'vmCount', 'numaOver', 'metric1', 'metric2', 'metric3', 'metric4', 'result'],
};