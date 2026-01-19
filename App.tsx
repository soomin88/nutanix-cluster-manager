import React, { useState } from 'react';
import ClusterManager from './components/ClusterManager';
import DataExplorer from './components/DataExplorer';
import { ClusterConfig } from './types';
import { Server } from 'lucide-react';

const App: React.FC = () => {
  const [clusters, setClusters] = useState<ClusterConfig[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);

  const activeCluster = clusters.find(c => c.id === selectedClusterId);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-nutanix-dark text-white h-16 flex items-center px-6 shadow-md z-10">
        <div className="flex items-center gap-6">
          <img 
            src="/jun-logo.jpg" 
            alt="JUN Logo" 
            className="h-10 w-auto flex-shrink-0"
          />
          <h1 className="text-xl font-light opacity-80 tracking-tight">Nutanix Cluster Analyst</h1>
        </div>
        <div className="ml-auto text-sm text-gray-400">
           {activeCluster ? `Connected: ${activeCluster.name}` : 'No Cluster Selected'}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 flex flex-col xl:flex-row gap-4">
        {/* Sidebar / Top Area for Cluster Management - Narrower */}
        <div className="w-full xl:w-[280px] flex-shrink-0 flex flex-col gap-3">
          <ClusterManager 
            clusters={clusters} 
            setClusters={setClusters} 
            selectedClusterId={selectedClusterId}
            onSelectCluster={setSelectedClusterId}
          />
          
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-600 shadow-sm">
            <h4 className="font-semibold mb-1 text-nutanix-dark text-sm">System Status</h4>
            <p className="leading-relaxed">
              {activeCluster 
                ? `Connected to ${activeCluster.ip} as ${activeCluster.username}` 
                : "Select or add a cluster to begin management."}
            </p>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeCluster ? (
            <DataExplorer cluster={activeCluster} />
          ) : (
            <div className="flex-1 bg-white rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-12 text-center text-gray-400 shadow-sm">
              <div className="max-w-md">
                <Server size={64} className="mx-auto mb-6 opacity-20 text-nutanix-blue" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">Welcome to Cluster Manager</h3>
                <p className="text-gray-500">Please add a Nutanix cluster (PE or PC) using the panel on the left, then select it to view real-time data.</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-nutanix-dark text-gray-400 text-xs py-3 px-6 text-center border-t border-gray-700">
        Copyright © 2026 Jun InC. All rights reserved.
      </footer>
    </div>
  );
};

export default App;