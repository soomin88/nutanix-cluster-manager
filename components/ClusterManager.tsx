import React, { useState, useEffect, useRef } from 'react';
import { ClusterConfig } from '../types';
import { Plus, Trash2, CheckCircle2, XCircle, Server, Loader2, Monitor, Database, LogOut, X, Eye, EyeOff, Download, Upload } from 'lucide-react';
import { verifyClusterConnection } from '../services/nutanixService';

interface ClusterManagerProps {
  clusters: ClusterConfig[];
  setClusters: React.Dispatch<React.SetStateAction<ClusterConfig[]>>;
  onSelectCluster: (id: string) => void;
  selectedClusterId: string | null;
}

const ClusterManager: React.FC<ClusterManagerProps> = ({ 
  clusters, 
  setClusters, 
  onSelectCluster,
  selectedClusterId
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [presets, setPresets] = useState<Array<{id: string; type: 'PE' | 'PC'; ip: string; username: string; password: string; apiVersion?: 'v2.0' | 'v4.0'}>>([]);
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('clusterPresets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);
  
  // Save presets to localStorage
  const savePresetsToStorage = (updatedPresets: typeof presets) => {
    setPresets(updatedPresets);
    localStorage.setItem('clusterPresets', JSON.stringify(updatedPresets));
  };
  
  // Form State
  const [newCluster, setNewCluster] = useState<Partial<ClusterConfig>>({
    ip: '',
    username: '',
    password: '',
    type: 'PE',
    apiVersion: 'v2.0'
  });
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddCluster = async () => {
    // If multiple presets are selected, connect them instead
    if (selectedPresets.size >= 2) {
      await connectSelectedPresets();
      return;
    }

    if (!newCluster.ip || !newCluster.username || !newCluster.password) {
        setErrorMsg("All fields are required.");
        return;
    }

    // v4.0 경고
    if (newCluster.apiVersion === 'v4.0') {
        alert("We are planning to update.");
        return;
    }

    setVerifying(true);
    setErrorMsg(null);
    
    const tempId = Date.now().toString();
    const clusterToAdd: ClusterConfig = {
      id: tempId,
      name: newCluster.type === 'PE' ? `Prism Element` : `Prism Central`,
      ip: newCluster.ip,
      username: newCluster.username,
      password: newCluster.password,
      type: newCluster.type as 'PE' | 'PC',
      apiVersion: (newCluster.apiVersion as 'v2.0' | 'v4.0') || 'v2.0',
      isVerified: false
    };

    try {
        // verifyClusterConnection will now return actual cluster name
        const result = await verifyClusterConnection(clusterToAdd);
        
        // If we get here, connection was successful - update with actual cluster name
        const finalCluster = { ...clusterToAdd, name: result.clusterName, isVerified: true };
        setClusters(prev => [...prev, finalCluster]);
        onSelectCluster(tempId);
        setIsModalOpen(false); // Close modal on success
        setNewCluster({ ip: '', username: '', password: '', type: 'PE' }); // Reset form
        
    } catch (e: any) {
        // Capture detailed error from service
        console.error("Connection attempt failed:", e);
        setErrorMsg(e.message || "Unknown error occurred.");
    } finally {
        setVerifying(false);
    }
  };

  const removeCluster = (id: string) => {
    setClusters(prev => prev.filter(c => c.id !== id));
    if (selectedClusterId === id) {
      onSelectCluster('');
    }
  };

  // Remove all clusters
  const removeAllClusters = (e: React.MouseEvent) => {
    e.stopPropagation();
    const count = clusters.length;
    if (count === 0) return;
    
    if (window.confirm(`Are you sure you want to remove all ${count} clusters?`)) {
      setClusters([]);
      onSelectCluster('');
    }
  };

  // Helper to fill demo data
  const fillDemo = (ip: string, type: 'PE' | 'PC') => {
      setNewCluster({
          ip,
          username: 'admin',
          password: 'Sbxkslrtm/4u!',
          type
      });
  };

  // Save current form as preset
  const saveAsPreset = () => {
    if (!newCluster.ip || !newCluster.username || !newCluster.password) {
      setErrorMsg("All fields are required to save a preset.");
      return;
    }

    const presetId = Date.now().toString();
    const newPreset = {
      id: presetId,
      type: newCluster.type as 'PE' | 'PC',
      ip: newCluster.ip,
      username: newCluster.username,
      password: newCluster.password,
      apiVersion: newCluster.apiVersion as 'v2.0' | 'v4.0' | undefined
    };

    savePresetsToStorage([...presets, newPreset]);
    setErrorMsg(null);
  };

  // Delete a preset
  const deletePreset = (id: string) => {
    savePresetsToStorage(presets.filter(p => p.id !== id));
  };

  // Fill form from preset
  const fillFromPreset = (preset: typeof presets[0]) => {
    setNewCluster({
      ip: preset.ip,
      username: preset.username,
      password: preset.password,
      type: preset.type,
      apiVersion: preset.apiVersion || 'v2.0'
    });
  };

  // Download Excel Template
  const downloadTemplate = () => {
    const template = [
      {"ip": "192.168.1.10", "username": "admin", "password": "pass123", "type": "PE", "apiVersion": "v2.0"},
      {"ip": "192.168.1.11", "username": "admin", "password": "pass456", "type": "PC", "apiVersion": "v2.0"}
    ];
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cluster_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload Excel Template
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);
        
        if (!Array.isArray(jsonData)) {
          setErrorMsg('Invalid JSON format. Expected an array of objects.');
          return;
        }

        // Process data
        const newPresets: typeof presets = [];
        jsonData.forEach((item, i) => {
          if (item.ip && item.username && item.password) {
            newPresets.push({
              id: `${Date.now()}_${i}`,
              type: (item.type === 'PC' ? 'PC' : 'PE'), // Default to PE if not specified
              ip: item.ip.toString().trim(),
              username: item.username.toString().trim(),
              password: item.password.toString().trim(),
              apiVersion: (item.apiVersion === 'v4.0' ? 'v4.0' : 'v2.0') // Default to v2.0
            });
          }
        });

        if (newPresets.length > 0) {
          savePresetsToStorage([...presets, ...newPresets]);
          setErrorMsg(null);
        } else {
          setErrorMsg('No valid data found in the template.');
        }
      } catch (error) {
        setErrorMsg('Failed to parse the JSON file. Please check the format.');
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Toggle preset selection
  const togglePresetSelection = (id: string) => {
    setSelectedPresets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all presets
  const selectAllPresets = () => {
    const allIds = new Set(presets.map(p => p.id));
    setSelectedPresets(allIds);
  };

  // Deselect all presets
  const deselectAllPresets = () => {
    setSelectedPresets(new Set());
  };

  // Delete selected presets
  const deleteSelectedPresets = () => {
    const remainingPresets = presets.filter(p => !selectedPresets.has(p.id));
    savePresetsToStorage(remainingPresets);
    setSelectedPresets(new Set());
  };

  // Connect multiple selected presets
  const connectSelectedPresets = async () => {
    const selectedPresetsList = presets.filter(p => selectedPresets.has(p.id));
    if (selectedPresetsList.length === 0) return;

    setVerifying(true);
    setErrorMsg(null);

    const successList: string[] = [];
    const failureList: Array<{ip: string; error: string}> = [];

    for (const preset of selectedPresetsList) {
      const tempId = `${Date.now()}_${Math.random()}`;
      const clusterToAdd: ClusterConfig = {
        id: tempId,
        name: preset.type === 'PE' ? `Prism Element` : `Prism Central`,
        ip: preset.ip,
        username: preset.username,
        password: preset.password,
        type: preset.type,
        apiVersion: preset.apiVersion || 'v2.0',
        isVerified: false
      };

      try {
        const result = await verifyClusterConnection(clusterToAdd);
        const finalCluster = { ...clusterToAdd, name: result.clusterName, isVerified: true };
        setClusters(prev => [...prev, finalCluster]);
        successList.push(preset.ip);
      } catch (e: any) {
        console.error(`Failed to connect to ${preset.ip}:`, e);
        failureList.push({
          ip: preset.ip,
          error: e.message || 'Connection failed'
        });
      }
    }

    setVerifying(false);
    
    // Show results
    if (failureList.length > 0) {
      const errorMessage = `Successfully connected: ${successList.length}\n\nFailed connections:\n${failureList.map(f => `• ${f.ip}: ${f.error}`).join('\n')}`;
      setErrorMsg(errorMessage);
    } else {
      setSelectedPresets(new Set()); // Clear selection only if all succeeded
      setIsModalOpen(false);
      setNewCluster({ ip: '', username: '', password: '', type: 'PE' });
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Server className="text-nutanix-blue" size={20} />
            <h2 className="text-lg font-semibold text-nutanix-dark">Clusters</h2>
          </div>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 bg-nutanix-blue text-white rounded-md text-xs hover:bg-blue-600 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add New
            </button>
            {clusters.length > 0 && (
              <button 
                onClick={(e) => removeAllClusters(e)}
                className="flex items-center justify-center gap-1 px-2 py-1 bg-red-500 text-white rounded-md text-xs hover:bg-red-600 transition-colors shadow-sm"
                type="button"
              >
                <Trash2 size={16} />
                Delete All
              </button>
            )}
          </div>
        </div>

        {/* Cluster List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {clusters.length === 0 && (
            <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-lg">
                <p className="text-gray-400 italic text-sm">No clusters configured.</p>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-2 text-nutanix-blue text-sm hover:underline font-medium"
                >
                    Add your first cluster
                </button>
            </div>
          )}
          {clusters.map(cluster => (
            <div 
              key={cluster.id}
              onClick={() => cluster.isVerified && onSelectCluster(cluster.id)}
              className={`relative group flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all duration-200
                ${selectedClusterId === cluster.id 
                    ? 'border-nutanix-blue bg-blue-50/50 shadow-sm ring-1 ring-nutanix-blue/30' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
              `}
            >
              <div className="mt-1">
                 {cluster.type === 'PE' ? <Database size={20} className="text-gray-500"/> : <Monitor size={20} className="text-purple-500"/>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 truncate">{cluster.name}</span>
                    {cluster.isVerified && <CheckCircle2 className="text-green-500 w-4 h-4 flex-shrink-0" />}
                </div>
                <div className="text-sm text-gray-500 font-mono mt-0.5">{cluster.ip}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                    <span className="uppercase bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{cluster.type}</span>
                    <span>{cluster.username}</span>
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); removeCluster(cluster.id); }}
                className="absolute top-3 right-3 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                title="Disconnect & Remove"
              >
                <LogOut size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Cluster Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-800">Add Cluster Connection</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 break-all font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                            <strong>Debug Info:</strong><br/>
                            {errorMsg}
                        </div>
                    )}

                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cluster Type</label>
                            <div className="flex gap-4">
                                <label className={`flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer transition-colors ${newCluster.type === 'PE' ? 'bg-blue-50 border-nutanix-blue ring-1 ring-nutanix-blue' : 'hover:bg-gray-50'}`}>
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        checked={newCluster.type === 'PE'} 
                                        onChange={() => setNewCluster({...newCluster, type: 'PE'})}
                                        className="text-nutanix-blue"
                                    />
                                    <Database size={18} className="text-gray-600" />
                                    <span className="text-sm font-medium">Prism Element</span>
                                </label>
                                <label className={`flex-1 border rounded-md p-3 flex items-center gap-2 cursor-pointer transition-colors ${newCluster.type === 'PC' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' : 'hover:bg-gray-50'}`}>
                                    <input 
                                        type="radio" 
                                        name="type" 
                                        checked={newCluster.type === 'PC'} 
                                        onChange={() => setNewCluster({...newCluster, type: 'PC'})}
                                        className="text-purple-600"
                                    />
                                    <Monitor size={18} className="text-gray-600" />
                                    <span className="text-sm font-medium">Prism Central</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue outline-none transition-all"
                                    placeholder="192.168.x.x"
                                    value={newCluster.ip}
                                    onChange={e => setNewCluster({...newCluster, ip: e.target.value})}
                                />
                                <select 
                                    className="w-24 px-2 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue focus:border-nutanix-blue outline-none text-sm"
                                    value={newCluster.apiVersion || 'v2.0'}
                                    onChange={e => setNewCluster({...newCluster, apiVersion: e.target.value as 'v2.0' | 'v4.0'})}
                                >
                                    <option value="v2.0">v2.0</option>
                                    <option value="v4.0">v4.0</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue outline-none"
                                    placeholder="admin"
                                    value={newCluster.username}
                                    onChange={e => setNewCluster({...newCluster, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-nutanix-blue outline-none"
                                        placeholder="••••••"
                                        value={newCluster.password}
                                        onChange={e => setNewCluster({...newCluster, password: e.target.value})}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Template Presets */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-2">Template : Multi-cluster registration</p>
                      
                      {/* Template Buttons */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={downloadTemplate}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
                        >
                          <Download size={14} />
                          Download Template
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md font-medium transition-colors"
                        >
                          <Upload size={14} />
                          Upload Template
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".json"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>

                      {/* Saved Presets List */}
                      {presets.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-500">
                              {selectedPresets.size > 0 && `${selectedPresets.size} selected`}
                            </span>
                            <div className="flex gap-2">
                              {selectedPresets.size > 0 && (
                                <button
                                  onClick={deleteSelectedPresets}
                                  className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded-md font-medium transition-colors"
                                >
                                  Delete Selected
                                </button>
                              )}
                              <button
                                onClick={selectedPresets.size === presets.length ? deselectAllPresets : selectAllPresets}
                                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-md font-medium transition-colors"
                              >
                                {selectedPresets.size === presets.length ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                          </div>
                          
                          {/* API v2.0 Presets */}
                          {presets.filter(p => !p.apiVersion || p.apiVersion === 'v2.0').length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 mt-2">API version v2.0</div>
                              <div className="flex gap-2 flex-wrap">
                                {presets.filter(p => !p.apiVersion || p.apiVersion === 'v2.0').map(preset => (
                                  <div key={preset.id} className="relative group">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedPresets.has(preset.id)}
                                        onChange={() => togglePresetSelection(preset.id)}
                                        className="w-3 h-3 text-nutanix-blue rounded"
                                      />
                                      <button 
                                        onClick={() => fillFromPreset(preset)}
                                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                                          selectedPresets.has(preset.id)
                                            ? 'bg-blue-100 border-2 border-nutanix-blue text-blue-700'
                                            : 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700'
                                        }`}
                                      >
                                        {preset.type} ({preset.ip})
                                      </button>
                                    </label>
                                    <button
                                      onClick={() => deletePreset(preset.id)}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete preset"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* API v4.0 Presets */}
                          {presets.filter(p => p.apiVersion === 'v4.0').length > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs font-semibold text-gray-600 mt-2">API version v4.0</div>
                              <div className="flex gap-2 flex-wrap">
                                {presets.filter(p => p.apiVersion === 'v4.0').map(preset => (
                                  <div key={preset.id} className="relative group">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={selectedPresets.has(preset.id)}
                                        onChange={() => togglePresetSelection(preset.id)}
                                        className="w-3 h-3 text-nutanix-blue rounded"
                                      />
                                      <button 
                                        onClick={() => fillFromPreset(preset)}
                                        className={`text-xs px-2 py-1 rounded font-medium transition-colors ${
                                          selectedPresets.has(preset.id)
                                            ? 'bg-purple-100 border-2 border-purple-600 text-purple-700'
                                            : 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700'
                                        }`}
                                      >
                                        {preset.type} ({preset.ip})
                                      </button>
                                    </label>
                                    <button
                                      onClick={() => deletePreset(preset.id)}
                                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Delete preset"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button 
                        onClick={() => setIsModalOpen(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveAsPreset}
                        className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                        Save Preset
                    </button>
                    <button 
                        onClick={handleAddCluster}
                        disabled={verifying}
                        className="px-4 py-2 bg-nutanix-blue text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {verifying && <Loader2 className="animate-spin" size={16} />}
                        {verifying ? 'Verifying...' : selectedPresets.size >= 2 ? `Connect (${selectedPresets.size} selected)` : 'Connect'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default ClusterManager;
