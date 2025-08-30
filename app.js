document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const content = document.getElementById('content');
    const mainNav = document.getElementById('main-nav');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');
    const mobileAddBtn = document.getElementById('mobile-add-btn');
    const sidebar = document.getElementById('sidebar');
    const nodeModal = document.getElementById('node-modal');
    const taskModal = document.getElementById('task-modal');
    const optionsModal = document.getElementById('options-modal');
    const bottomNav = document.getElementById('bottom-nav');
    
    // --- APP STATE ---
    let currentView = 'dashboard';
    let nodes, tasksData, activityLog, settings;
    let currentSettingsView = 'general';
    let selectedSettingsNode = null;
    let currentKanbanStage = null;
    let leadSourceChart = null;
    let revenueChart = null;

    // --- DEFAULTS & PERSISTENCE ---
    const defaultNodes = { 
        Leads: { 
            view: 'table', 
            icon: 'users', 
            isCore: true, 
            fields: [ 
                { name: 'Name', type: 'text', required: true, isCore: true }, 
                { name: 'Email', type: 'email', required: true, isCore: true }, 
                { name: 'Company', type: 'text', required: false, isCore: false },
                { name: 'Status', type: 'select', required: true, isCore: true, options: ['New', 'Contacted', 'Qualified', 'Unqualified'] },
                { name: 'Source', type: 'select', required: false, isCore: false, options: ['Website', 'Referral', 'Cold Call', 'Conference'] },
                { name: 'Follow-Up Date', type: 'date', required: false, isCore: false },
            ], 
            data: [
                { id: 1, Name: 'Themba Nkosi', Email: 'themba.n@fnb.co.za', Company: 'FNB', Status: 'Contacted', Source: 'Referral', 'Follow-Up Date': '2025-09-05' },
                { id: 2, Name: 'Sarah Chen', Email: 'sarah.chen@vodacom.co.za', Company: 'Vodacom', Status: 'Qualified', Source: 'Website', 'Follow-Up Date': '2025-09-02' },
                { id: 3, Name: 'David Miller', Email: 'david.m@eskom.co.za', Company: 'Eskom', Status: 'New', Source: 'Cold Call', 'Follow-Up Date': '' },
                { id: 4, Name: 'Lerato Mokoena', Email: 'lerato.m@mtn.co.za', Company: 'MTN', Status: 'New', Source: 'Website', 'Follow-Up Date': '' },
                { id: 5, Name: 'Pieter van der Merwe', Email: 'pieter.v@sanlam.co.za', Company: 'Sanlam', Status: 'Unqualified', Source: 'Conference', 'Follow-Up Date': '' },
                { id: 6, Name: 'Naledi Khumalo', Email: 'naledi.k@discovery.co.za', Company: 'Discovery', Status: 'Qualified', Source: 'Referral', 'Follow-Up Date': '2025-09-10' }
            ], 
            nextId: 7 
        }, 
        Deals: { 
            view: 'kanban', 
            icon: 'dollar-sign', 
            isCore: true, 
            fields: [ 
                { name: 'Name', type: 'text', required: true }, 
                { name: 'Company', type: 'text', required: true }, 
                { name: 'Value', type: 'number', required: true } 
            ], 
            stages: ['Lead', 'Contact Made', 'Proposal Sent', 'Won'], 
            data: [
                { id: 1, Name: 'Cloud Migration', Company: 'FNB', Value: 50000, stage: 'Contact Made', lastActivityDate: '2025-08-28T10:00:00.000Z' },
                { id: 2, Name: 'Network Upgrade', Company: 'Vodacom', Value: 75000, stage: 'Proposal Sent', lastActivityDate: '2025-08-25T10:00:00.000Z' },
                { id: 3, Name: 'Power Grid Analytics', Company: 'Eskom', Value: 120000, stage: 'Lead', lastActivityDate: '2025-08-10T10:00:00.000Z' },
                { id: 4, Name: 'Mobile App Security', Company: 'MTN', Value: 60000, stage: 'Won', wonDate: '2025-08-15T10:00:00.000Z', lastActivityDate: '2025-08-15T10:00:00.000Z' },
                { id: 5, Name: 'Investment Platform', Company: 'Sanlam', Value: 95000, stage: 'Proposal Sent', lastActivityDate: '2025-08-29T10:00:00.000Z' },
                { id: 6, Name: 'Health App Integration', Company: 'Discovery', Value: 82000, stage: 'Contact Made', lastActivityDate: '2025-07-20T10:00:00.000Z' }
            ], 
            nextId: 7 
        } 
    };
    const defaultTasks = [];
    const defaultActivityLog = [];
    const defaultSettings = { monthlyGoal: 250000 };

    function saveState() {
        localStorage.setItem('crm_nodes', JSON.stringify(nodes));
        localStorage.setItem('crm_tasks', JSON.stringify(tasksData));
        localStorage.setItem('crm_activity', JSON.stringify(activityLog));
        localStorage.setItem('crm_settings', JSON.stringify(settings));
    }
    function loadState() { 
        const savedNodes = localStorage.getItem('crm_nodes'); 
        const savedTasks = localStorage.getItem('crm_tasks'); 
        const savedActivity = localStorage.getItem('crm_activity');
        const savedSettings = localStorage.getItem('crm_settings');
        nodes = savedNodes ? JSON.parse(savedNodes) : defaultNodes;
        tasksData = savedTasks ? JSON.parse(savedTasks) : defaultTasks; 
        activityLog = savedActivity ? JSON.parse(savedActivity) : defaultActivityLog;
        settings = savedSettings ? JSON.parse(savedSettings) : defaultSettings;
    }
    function logActivity(message) { 
        activityLog.unshift({ message, time: new Date().toISOString() }); 
        if (activityLog.length > 20) { activityLog.pop(); } 
        saveState(); 
    }

    function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
    function hideModal(id) { document.getElementById(id).classList.add('hidden'); }
    
    function showNodeModal(nodeName, item = null) { 
        const node = nodes[nodeName];
        const formFields = document.getElementById('node-form-fields');
        document.getElementById('node-type').value = nodeName;

        formFields.innerHTML = node.fields.map(field => {
            let fieldHtml = `<div><label for="node-field-${field.name}" class="block text-sm font-medium text-slate-700 mb-1">${field.name}</label>`;
            if (field.type === 'select') {
                const options = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                fieldHtml += `<select id="node-field-${field.name}" name="${field.name}" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">${options}</select>`;
            } else {
                fieldHtml += `<input type="${field.type}" id="node-field-${field.name}" name="${field.name}" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" ${field.required ? 'required' : ''}>`;
            }
            fieldHtml += '</div>';
            return fieldHtml;
        }).join('');

        if (item) {
            document.getElementById('node-modal-title').innerText = `Edit ${nodeName.slice(0, -1)}`;
            document.getElementById('node-id').value = item.id;
            node.fields.forEach(field => {
                const input = document.getElementById(`node-field-${field.name}`);
                if (input) input.value = item[field.name] || '';
            });
        } else {
            document.getElementById('node-modal-title').innerText = `Add New ${nodeName.slice(0, -1)}`;
            document.getElementById('node-form').reset();
            document.getElementById('node-id').value = '';
            document.getElementById('node-type').value = nodeName;
        }
        showModal('node-modal');
    };
    function saveNodeItem(e) {
        e.preventDefault();
        const nodeName = document.getElementById('node-type').value;
        const node = nodes[nodeName];
        const id = document.getElementById('node-id').value;
        const newItemData = {};
        node.fields.forEach(field => {
            const input = document.getElementById(`node-field-${field.name}`);
            if (input) newItemData[field.name] = input.value;
        });
        if (id) {
            const existingItem = node.data.find(item => item.id === parseInt(id));
            const updatedItem = { ...existingItem, ...newItemData, lastActivityDate: new Date().toISOString() };
            node.data = node.data.map(item => item.id === parseInt(id) ? updatedItem : item);
        } else {
            newItemData.id = node.nextId++;
            if (node.view === 'kanban') { newItemData.stage = node.stages[0]; }
            newItemData.lastActivityDate = new Date().toISOString();
            node.data.push(newItemData);
            logActivity(`New ${nodeName.slice(0,-1)} "${newItemData.Name}" created.`);
        }
        saveState();
        renderView(currentView);
        hideModal('node-modal');
    };
    
    function convertLeadToDeal(leadId) {
        const leadsNode = nodes['Leads'];
        const dealsNode = nodes['Deals'];
        if (!leadsNode || !dealsNode) return;
        const leadIndex = leadsNode.data.findIndex(lead => lead.id === leadId);
        if (leadIndex === -1) return;
        const [leadToConvert] = leadsNode.data.splice(leadIndex, 1);
        const newDeal = {
            id: dealsNode.nextId++,
            Name: leadToConvert.Name,
            Company: leadToConvert.Company,
            Value: 0,
            stage: dealsNode.stages[0],
            lastActivityDate: new Date().toISOString()
        };
        dealsNode.data.push(newDeal);
        logActivity(`Lead "${newDeal.Name}" converted to a deal.`);
        saveState();
        if(currentView === 'Leads') { renderNodeTable('Leads'); }
    };

    function renderLeadSourceChart() {
        const leads = nodes.Leads ? nodes.Leads.data : [];
        const sourceCounts = leads.reduce((acc, lead) => {
            const source = lead.Source || 'Unknown';
            acc[source] = (acc[source] || 0) + 1;
            return acc;
        }, {});

        const ctx = document.getElementById('leadSourceChart')?.getContext('2d');
        if (!ctx) return;

        if (leadSourceChart) {
            leadSourceChart.destroy();
        }

        leadSourceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(sourceCounts),
                datasets: [{
                    data: Object.values(sourceCounts),
                    backgroundColor: [ '#4f46e5', '#7c3aed', '#db2777', '#f59e0b', '#10b981', '#3b82f6' ],
                    borderColor: '#f1f5f9',
                    borderWidth: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20 } } },
                cutout: '70%'
            }
        });
    }
    
    function renderRevenueTrendChart() {
        const deals = nodes.Deals ? nodes.Deals.data.filter(d => d.stage === 'Won' && d.wonDate) : [];
        const monthlyRevenue = {};
        for(let i=5; i>=0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyRevenue[monthKey] = 0;
        }

        deals.forEach(deal => {
            const wonDate = new Date(deal.wonDate);
            const monthKey = `${wonDate.getFullYear()}-${String(wonDate.getMonth() + 1).padStart(2, '0')}`;
            if(monthlyRevenue.hasOwnProperty(monthKey)) {
                monthlyRevenue[monthKey] += Number(deal.Value);
            }
        });
        
        const labels = Object.keys(monthlyRevenue).map(key => new Date(key + '-01').toLocaleString('default', { month: 'short' }));
        const data = Object.values(monthlyRevenue);

        const ctx = document.getElementById('revenueTrendChart')?.getContext('2d');
        if (!ctx) return;

        if (revenueChart) {
            revenueChart.destroy();
        }

        revenueChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Won Revenue',
                    data: data,
                    backgroundColor: '#4f46e5',
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: value => 'R' + (value / 1000) + 'k' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderDashboard() {
        const leadsNode = nodes['Leads'];
        const dealsNode = nodes['Deals'];
        
        const wonDealsThisMonth = (dealsNode ? dealsNode.data : [])
            .filter(d => {
                if (d.stage !== 'Won' || !d.wonDate) return false;
                const wonDate = new Date(d.wonDate);
                const today = new Date();
                return wonDate.getFullYear() === today.getFullYear() && wonDate.getMonth() === today.getMonth();
            });

        const revenueThisMonth = wonDealsThisMonth.reduce((sum, d) => sum + Number(d.Value), 0);
        const goalProgress = settings.monthlyGoal > 0 ? (revenueThisMonth / settings.monthlyGoal) * 100 : 0;
        
        const staleDeals = (dealsNode ? dealsNode.data : [])
            .filter(d => {
                if(d.stage === 'Won') return false;
                const lastActivity = new Date(d.lastActivityDate);
                const daysSinceActivity = (new Date() - lastActivity) / (1000 * 3600 * 24);
                return daysSinceActivity > 14;
            }).slice(0, 5);

        const staleDealsHtml = staleDeals.map(deal => `
            <li class="border-b border-slate-200 py-3">
                <p class="text-sm font-medium text-slate-800">${deal.Name}</p>
                <p class="text-xs text-slate-500 mt-1">${Math.floor((new Date() - new Date(deal.lastActivityDate)) / (1000 * 3600 * 24))} days since last activity</p>
            </li>`).join('') || '<p class="text-slate-500">No stale deals. Great job!</p>';

        const activityHtml = activityLog.map(item => `<li class="border-b border-slate-200 py-3"><p class="text-sm text-slate-800">${item.message}</p><p class="text-xs text-slate-500 mt-1">${new Date(item.time).toLocaleString()}</p></li>`).join('') || '<p class="text-slate-500">No recent activity.</p>';
        
        const totalLeads = leadsNode ? leadsNode.data.length : 0;
        const activeDeals = dealsNode ? dealsNode.data.filter(d => d.stage !== 'Won').length : 0;
        const totalWonValue = dealsNode ? dealsNode.data.filter(d => d.stage === 'Won').reduce((sum, d) => sum + Number(d.Value), 0) : 0;
        
        const kpiCardsHtml = `
            <div class="bg-white p-6 rounded-lg shadow-md"><div class="flex items-center"><div class="bg-indigo-100 p-3 rounded-full"><i data-feather="users" class="text-indigo-600"></i></div><div class="ml-4"><p class="text-sm text-slate-500">Total Leads</p><p class="text-2xl font-bold">${totalLeads}</p></div></div></div>
            <div class="bg-white p-6 rounded-lg shadow-md"><div class="flex items-center"><div class="bg-amber-100 p-3 rounded-full"><i data-feather="dollar-sign" class="text-amber-600"></i></div><div class="ml-4"><p class="text-sm text-slate-500">Active Deals</p><p class="text-2xl font-bold">${activeDeals}</p></div></div></div>
            <div class="bg-white p-6 rounded-lg shadow-md"><div class="flex items-center"><div class="bg-emerald-100 p-3 rounded-full"><i data-feather="trending-up" class="text-emerald-600"></i></div><div class="ml-4"><p class="text-sm text-slate-500">Total Revenue (Won)</p><p class="text-2xl font-bold">R ${totalWonValue.toLocaleString()}</p></div></div></div>
        `;

        const isMobile = window.innerWidth < 768;
        if (isMobile) {
             content.innerHTML = `
                <div class="space-y-6">
                    <div class="grid grid-cols-2 gap-4">
                       <div class="bg-white p-4 rounded-lg shadow-md"><p class="text-sm text-slate-500">Total Leads</p><p class="text-xl font-bold">${totalLeads}</p></div>
                       <div class="bg-white p-4 rounded-lg shadow-md"><p class="text-sm text-slate-500">Active Deals</p><p class="text-xl font-bold">${activeDeals}</p></div>
                    </div>
                     <div class="bg-white p-4 rounded-lg shadow-md">
                        <h3 class="font-semibold mb-2 text-lg">Monthly Goal</h3>
                        <div class="w-full bg-slate-200 rounded-full h-2.5">
                            <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${Math.min(goalProgress, 100)}%"></div>
                        </div>
                        <div class="text-sm text-slate-600 mt-2">
                            <span class="font-bold">R ${revenueThisMonth.toLocaleString()}</span> of R ${settings.monthlyGoal.toLocaleString()}
                        </div>
                     </div>
                    <div class="bg-white p-4 rounded-lg shadow-md"><h3 class="font-semibold mb-2 text-lg">Lead Source Breakdown</h3><div class="h-64"><canvas id="leadSourceChart"></canvas></div></div>
                    <div class="bg-white p-4 rounded-lg shadow-md"><h3 class="font-semibold mb-2 text-lg">Recent Activity</h3><ul class="h-64 overflow-y-auto">${activityHtml}</ul></div>
                </div>`;
        } else {
            content.innerHTML = `
                <h2 class="text-3xl font-bold mb-6 text-slate-800">Dashboard</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">${kpiCardsHtml}</div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-md col-span-1 lg:col-span-3">
                        <h3 class="font-semibold text-lg">Monthly Goal Progress</h3>
                        <div class="flex items-center justify-between text-sm text-slate-600 mt-2">
                            <span>R ${revenueThisMonth.toLocaleString()}</span>
                            <span>Goal: R ${settings.monthlyGoal.toLocaleString()}</span>
                        </div>
                        <div class="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                            <div class="bg-indigo-600 h-2.5 rounded-full" style="width: ${Math.min(goalProgress, 100)}%"></div>
                        </div>
                    </div>
                </div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="font-semibold mb-4 text-lg">Won Revenue (Last 6 Months)</h3><div class="h-64"><canvas id="revenueTrendChart"></canvas></div></div>
                     <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="font-semibold mb-4 text-lg">Lead Source Breakdown</h3><div class="h-64"><canvas id="leadSourceChart"></canvas></div></div>
                </div>
                <div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="font-semibold mb-4 text-lg">Stale Deals (> 14 days)</h3><ul class="h-64 overflow-y-auto">${staleDealsHtml}</ul></div>
                    <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="font-semibold mb-4 text-lg">Recent Activity</h3><ul class="h-64 overflow-y-auto">${activityHtml}</ul></div>
                </div>
                `;
        }
        feather.replace();
        renderLeadSourceChart();
        renderRevenueTrendChart();
    };
    function renderNavigation() {
        const mainNavLinks = Object.keys(nodes).map(nodeName => `<a href="#" data-view="${nodeName}" class="nav-link flex items-center px-4 py-2 text-slate-700 rounded-lg hover:bg-slate-100"><i data-feather="${nodes[nodeName].icon || 'box'}" class="w-5 h-5"></i><span class="ml-3">${nodeName}</span></a>`).join('');
        mainNav.innerHTML = `<a href="#" data-view="dashboard" class="nav-link flex items-center px-4 py-2 text-slate-700 rounded-lg hover:bg-slate-100"><i data-feather="home" class="w-5 h-5"></i><span class="ml-3">Dashboard</span></a> ${mainNavLinks}`;
        
        const bottomNavLinks = [ 'dashboard', 'Leads', 'Deals', 'settings' ].map(view => {
            const icon = view === 'dashboard' ? 'home' : (nodes[view] ? nodes[view].icon : 'settings');
            return `<a href="#" data-view="${view}" class="bottom-nav-link flex flex-col items-center justify-center text-slate-500 flex-1 py-2"><i data-feather="${icon}" class="w-6 h-6"></i><span class="text-xs mt-1">${view.charAt(0).toUpperCase() + view.slice(1)}</span></a>`;
        }).join('');
        bottomNav.innerHTML = bottomNavLinks;

        updateActiveNav(currentView);
        feather.replace();
    };
    function updateActiveNav(viewName) {
        document.querySelectorAll('.nav-link, .bottom-nav-link').forEach(l => l.classList.remove('nav-active'));
        document.querySelectorAll(`.nav-link[data-view="${viewName}"], .bottom-nav-link[data-view="${viewName}"]`).forEach(link => link.classList.add('nav-active'));
    };
    function renderNodeTable(nodeName, dataToRender) {
        const node = nodes[nodeName];
        const tableContainer = document.querySelector('#content .overflow-x-auto');
        if (!tableContainer) return;

        const statusColors = { New: 'bg-blue-100 text-blue-800', Contacted: 'bg-amber-100 text-amber-800', Qualified: 'bg-emerald-100 text-emerald-800', Unqualified: 'bg-slate-100 text-slate-800' };

        const tableHeaders = node.fields.map(field => `<th class="p-4 text-left font-semibold text-slate-600">${field.name}</th>`).join('');
        const tableRows = (dataToRender || node.data).map(item => {
            const cells = node.fields.map(field => {
                let value = item[field.name] || '';
                if (field.name === 'Status' && value) {
                    return `<td class="p-4 break-words border-t border-slate-200"><span class="status-tag ${statusColors[value] || 'bg-gray-100 text-gray-800'}">${value}</span></td>`;
                }
                if (field.type === 'number' && value) { value = `R ${Number(value).toLocaleString()}`; }
                return `<td class="p-4 break-words border-t border-slate-200">${value}</td>`
            }).join('');

            const convertButton = (nodeName === 'Leads' && nodes['Deals'] && item.Status === 'Qualified') ? `<button class="convert-lead-btn p-2 text-emerald-500 hover:text-emerald-600" data-id="${item.id}" title="Convert to Deal"><i data-feather="arrow-right-circle" class="w-5 h-5"></i></button>` : '';
            let actionButtons = `<div class="flex items-center">${convertButton}<button class="edit-node-item-btn p-2 text-indigo-500 hover:text-indigo-600" data-id="${item.id}" data-node="${nodeName}"><i data-feather="edit-2" class="w-5 h-5"></i></button><button class="delete-node-item-btn p-2 text-rose-500 hover:text-rose-600" data-id="${item.id}" data-node="${nodeName}"><i data-feather="trash-2" class="w-5 h-5"></i></button></div>`;
            
            return `<tr class="table-row-hover" data-id="${item.id}" data-node="${nodeName}">${cells}<td class="p-4 border-t border-slate-200">${actionButtons}</td></tr>`;
        }).join('');

        tableContainer.innerHTML = `<table class="w-full text-left"><thead><tr class="bg-slate-50">${tableHeaders}<th class="p-4 text-left font-semibold text-slate-600">Actions</th></tr></thead><tbody>${tableRows}</tbody></table>`;
        feather.replace();
    };
    function renderNodeKanban(nodeName) {
        const node = nodes[nodeName];
        const isMobile = window.innerWidth < 768;
        if(isMobile) {
            if(!currentKanbanStage) currentKanbanStage = node.stages[0];
            const tabsHtml = node.stages.map(stage => `<button class="kanban-tab flex-1 py-3 text-sm text-slate-600 border-b-2 ${stage === currentKanbanStage ? 'active' : 'border-transparent'}" data-stage="${stage}">${stage}</button>`).join('');
            const cardsHtml = node.data.filter(item => item.stage === currentKanbanStage).map(item => `
                <div class="bg-white p-4 rounded-lg shadow deal-card" data-id="${item.id}" data-node="${nodeName}">
                    <p class="font-semibold">${item.Name}</p>
                    <p class="text-sm text-slate-600">${item.Company}</p>
                    <p class="text-sm text-emerald-600 font-bold mt-2">R ${Number(item.Value).toLocaleString()}</p>
                </div>`).join('') || `<div class="p-4 text-center text-slate-500">No deals in this stage.</div>`;

            content.querySelector('#kanban-board').innerHTML = `
                <div class="flex border-b border-slate-200 mb-4">${tabsHtml}</div>
                <div class="space-y-4">${cardsHtml}</div>
            `;
        } else {
            const kanbanContainer = document.getElementById('kanban-board');
            if (!kanbanContainer) return;
            kanbanContainer.innerHTML = node.stages.map(stage => `
                <div class="flex-1 rounded-lg p-4 kanban-column min-w-[280px]" data-stage="${stage}">
                    <h3 class="font-bold mb-4 text-slate-700 tracking-wider uppercase text-sm">${stage}</h3>
                    <div class="space-y-4 deal-list">${node.data.filter(item => item.stage === stage).map(item => `
                        <div class="bg-white p-4 rounded-lg shadow deal-card" draggable="true" data-id="${item.id}" data-node="${nodeName}">
                            <p class="font-semibold">${item.Name}</p>
                            <p class="text-sm text-slate-600">${item.Company}</p>
                            <p class="text-sm text-emerald-600 font-bold mt-2">R ${Number(item.Value).toLocaleString()}</p>
                        </div>`).join('')}
                    </div>
                </div>`).join('');
            setupKanbanListeners(nodeName);
        }
        feather.replace();
    };

    function getNodeViewTemplate(nodeName) {
        const node = nodes[nodeName];
        const singularName = nodeName.endsWith('s') ? nodeName.slice(0, -1) : nodeName;
        const headerHtml = `
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 class="text-3xl font-bold text-slate-800">${nodeName}</h2>
                <button id="add-node-item-btn" data-node="${nodeName}" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg flex items-center w-full sm:w-auto">
                    <i data-feather="plus" class="w-5 h-5 mr-2"></i>Add ${singularName}
                </button>
            </div>`;

        if (node.view === 'table') {
            return `${headerHtml}<div class="bg-white p-4 sm:p-6 rounded-lg shadow-md"><div class="mb-4"><input type="text" id="search-node-items" data-node="${nodeName}" placeholder="Search ${nodeName.toLowerCase()}..." class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"></div><div class="overflow-x-auto"></div></div>`;
        }
        if (node.view === 'kanban') {
            return `${headerHtml}<div id="kanban-board" class="flex flex-col md:flex-row gap-6 overflow-x-auto pb-4"></div>`;
        }
        return '';
    };

    function setupKanbanListeners(nodeName) {
        const kanbanBoard = document.getElementById('kanban-board');
        if (!kanbanBoard) return;
        let draggedItemId = null;
        kanbanBoard.addEventListener('dragstart', e => { if (e.target.classList.contains('deal-card')) { draggedItemId = e.target.dataset.id; setTimeout(() => e.target.classList.add('dragging'), 0); } });
        kanbanBoard.addEventListener('dragend', e => { if (e.target.classList.contains('deal-card')) { e.target.classList.remove('dragging'); draggedItemId = null; } });
        kanbanBoard.addEventListener('dragover', e => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column) { column.classList.add('drag-over'); } });
        kanbanBoard.addEventListener('dragleave', e => { const column = e.target.closest('.kanban-column'); if (column) { column.classList.remove('drag-over'); } });
        kanbanBoard.addEventListener('drop', e => { e.preventDefault(); const column = e.target.closest('.kanban-column'); if (column && draggedItemId) { column.classList.remove('drag-over'); const newStage = column.dataset.stage; const deal = nodes[nodeName].data.find(d => d.id === parseInt(draggedItemId)); if (deal && deal.stage !== newStage) { deal.lastActivityDate = new Date().toISOString(); logActivity(`Deal "${deal.Name}" moved to ${newStage}.`); deal.stage = newStage; if(newStage === 'Won') deal.wonDate = new Date().toISOString(); saveState(); renderNodeKanban(nodeName); } } });
    };
    
    function showOptionsModal(nodeName, fieldIndex) {
        const node = nodes[nodeName];
        const field = node.fields[fieldIndex];
        document.getElementById('options-modal-title').textContent = `Edit Options for "${field.name}"`;
        document.getElementById('options-node-name').value = nodeName;
        document.getElementById('options-field-index').value = fieldIndex;
        
        const optionsList = document.getElementById('options-list');
        optionsList.innerHTML = field.options.map((option, index) => `
            <li class="flex items-center justify-between p-2 bg-slate-100 rounded">
                <span>${option}</span>
                <button class="remove-option-btn text-rose-500 hover:text-rose-700 p-1" data-index="${index}">
                    <i data-feather="x-circle" class="w-4 h-4"></i>
                </button>
            </li>
        `).join('');
        
        feather.replace();
        showModal('options-modal');
    }

    function renderSettings() {
         content.innerHTML = `
            <h2 class="text-3xl font-bold mb-6 text-slate-800">Settings</h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div class="col-span-1">
                    <nav id="settings-nav" class="space-y-1">
                        <a href="#" class="settings-nav-link p-3 rounded-lg flex items-center gap-3" data-settings-view="general">
                            <i data-feather="sliders" class="w-5 h-5"></i> General
                        </a>
                        <a href="#" class="settings-nav-link p-3 rounded-lg flex items-center gap-3" data-settings-view="nodes">
                            <i data-feather="database" class="w-5 h-5"></i> Nodes & Fields
                        </a>
                        <a href="#" class="settings-nav-link p-3 rounded-lg flex items-center gap-3" data-settings-view="export">
                            <i data-feather="download" class="w-5 h-5"></i> Data & Export
                        </a>
                    </nav>
                </div>
                <div id="settings-content" class="md:col-span-3"></div>
            </div>
         `;
         renderSettingsSubView(currentSettingsView);
         feather.replace();
    }

    function renderSettingsSubView(view) {
        currentSettingsView = view;
        document.querySelectorAll('.settings-nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`.settings-nav-link[data-settings-view="${view}"]`)?.classList.add('active');

        const settingsContent = document.getElementById('settings-content');
        if (!settingsContent) return;

        if(view === 'general') {
             settingsContent.innerHTML = `
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-xl font-semibold mb-4 flex items-center">General Settings</h3>
                    <div class="flex flex-col sm:flex-row items-center gap-4">
                        <label for="monthly-goal" class="w-full sm:w-auto text-sm font-medium text-slate-700">Monthly Revenue Goal (R)</label>
                        <input type="number" id="monthly-goal" value="${settings.monthlyGoal}" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                </div>`;
        } else if (view === 'nodes') {
             const nodeManagerHtml = Object.keys(nodes).map(nodeName => `<div class="setting-node-item flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer border-l-4 border-transparent" data-node="${nodeName}"><span>${nodeName}</span> ${!nodes[nodeName].isCore ? `<button class="delete-node-btn text-rose-500 hover:text-rose-600 p-2" data-node="${nodeName}"><i data-feather="trash-2" class="w-5 h-5"></i></button>` : ''}</div>`).join('');
             settingsContent.innerHTML = `<div class="space-y-8"> <div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-xl font-semibold mb-4 flex items-center">Create & Manage Nodes</h3><div id="settings-node-list" class="space-y-3 mb-4">${nodeManagerHtml}</div><div class="flex flex-col sm:flex-row items-center gap-4"><input type="text" id="new-node-name" placeholder="New Node Name" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"><select id="new-node-view" class="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="table">Table</option><option value="kanban">Kanban</option></select><button id="add-node-btn" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Create</button></div></div><div id="node-specific-settings"></div></div>`;
             if (selectedSettingsNode) {
                 renderNodeSpecificSettings(selectedSettingsNode);
                 document.querySelector(`.setting-node-item[data-node="${selectedSettingsNode}"]`)?.classList.add('active');
             }
        } else if (view === 'export') {
            const exportNodeOptions = Object.keys(nodes).map(nodeName => `<option value="${nodeName}">${nodeName}</option>`).join('');
            settingsContent.innerHTML = `
                 <div class="bg-white p-6 rounded-lg shadow-md space-y-6">
                    <h3 class="text-xl font-semibold mb-2 flex items-center">Data & Export</h3>
                    <div>
                        <h4 class="font-medium mb-2">Export Node to CSV</h4>
                        <div class="flex items-center gap-4">
                            <select id="export-node-select" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">${exportNodeOptions}</select>
                            <button id="export-csv-btn" class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Export CSV</button>
                        </div>
                    </div>
                     <div>
                        <h4 class="font-medium mb-2">Full Backup</h4>
                        <p class="text-sm text-slate-500 mb-2">Download all your CRM data (Nodes, Settings, etc.) in a single JSON file.</p>
                        <button id="export-json-btn" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Download Backup</button>
                    </div>
                </div>
            `;
        }
        feather.replace();
    }
    
    function exportToCsv(nodeName) {
        const node = nodes[nodeName];
        if (!node || node.data.length === 0) {
            alert('No data to export for this node.');
            return;
        }

        const headers = node.fields.map(f => f.name);
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(',') + '\n';

        node.data.forEach(item => {
            const row = headers.map(header => {
                let cell = item[header] || '';
                if (String(cell).includes(',')) {
                    cell = `"${cell}"`;
                }
                return cell;
            });
            csvContent += row.join(',') + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${nodeName}_export.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    function exportToJson() {
        const backupData = {
            nodes: nodes,
            settings: settings,
            tasksData: tasksData,
            activityLog: activityLog
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
        const link = document.createElement("a");
        link.setAttribute("href", jsonString);
        link.setAttribute("download", `node_crm_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function renderNodeSpecificSettings(nodeName) {
         const node = nodes[nodeName];
        const container = document.getElementById('node-specific-settings');
        if (!container || !node) return;
        const fieldsList = node.fields.map((field, index) => {
            const editButton = field.type === 'select' ? `<button class="edit-options-btn text-indigo-500 hover:text-indigo-700 p-2" data-index="${index}"><i data-feather="edit" class="w-4 h-4"></i></button>` : '';
            const deleteButton = !field.isCore ? `<button class="delete-field-btn text-rose-500 hover:text-rose-600 p-2" data-index="${index}"><i data-feather="trash-2" class="w-5 h-5"></i></button>` : '';
            return `<li class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span>${field.name} <span class="text-xs text-slate-500">(${field.type})</span></span>
                        <div class="flex items-center">
                            ${editButton}
                            ${deleteButton}
                        </div>
                    </li>`;
        }).join('');
        const fieldsManager = `<div class="bg-white p-6 rounded-lg shadow-md"><h3 class="text-xl font-semibold mb-4">Manage Fields for ${nodeName}</h3><ul id="contact-fields-list" class="space-y-3 mb-4">${fieldsList}</ul><div class="flex flex-col sm:flex-row items-center gap-4"><input type="text" id="new-field-name" placeholder="Field Name" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"><select id="new-field-type" class="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"><option value="text">Text</option><option value="email">Email</option><option value="tel">Phone</option><option value="number">Number</option><option value="date">Date</option><option value="select">Select</option></select><button id="add-field-btn" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button></div></div>`;
        let stagesManager = '';
        if (node.view === 'kanban') {
            const stagesList = node.stages.map((stage, index) => `<li class="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span>${stage}</span> ${node.stages.length > 1 ? `<button class="delete-stage-btn text-rose-500 hover:text-rose-600 p-2" data-index="${index}"><i data-feather="trash-2" class="w-5 h-5"></i></button>` : ''}</li>`).join('');
            stagesManager = `<div class="bg-white p-6 rounded-lg shadow-md mt-8"><h3 class="text-xl font-semibold mb-4">Manage Stages for ${nodeName}</h3><ul class="space-y-3 mb-4">${stagesList}</ul><div class="flex items-center"><input type="text" id="new-stage-name" placeholder="Add new stage" class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"><button id="add-stage-btn" class="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Add</button></div></div>`;
        }
        container.innerHTML = fieldsManager + stagesManager;
        feather.replace();
    }

    function setupSettingsViewListeners() {
        const container = document.getElementById('content');
        if(!container) return;

        container.addEventListener('input', e => {
            if(e.target.id === 'monthly-goal') {
                const newGoal = parseInt(e.target.value);
                if (!isNaN(newGoal) && newGoal >= 0) {
                    settings.monthlyGoal = newGoal;
                    saveState();
                    logActivity(`Monthly goal updated to R ${newGoal.toLocaleString()}`);
                }
            }
        });

        container.addEventListener('click', e => {
            const settingsLink = e.target.closest('.settings-nav-link');
             if (settingsLink) {
                e.preventDefault();
                renderSettingsSubView(settingsLink.dataset.settingsView);
            }

            const addNodeBtn = e.target.closest('#add-node-btn');
            const deleteNodeBtn = e.target.closest('.delete-node-btn');
            const nodeItem = e.target.closest('.setting-node-item');
            if (addNodeBtn) { const nameInput = document.getElementById('new-node-name'); const viewInput = document.getElementById('new-node-view'); const nodeName = nameInput.value.trim(); if (nodeName && !nodes[nodeName]) { nodes[nodeName] = { view: viewInput.value, icon: 'box', isCore: false, fields: [{ name: 'Name', type: 'text', required: true, isCore: true }], data: [], nextId: 1 }; if (viewInput.value === 'kanban') { nodes[nodeName].stages = ['To Do', 'In Progress', 'Done']; } nameInput.value = ''; logActivity(`Created new Node: "${nodeName}".`); saveState(); renderNavigation(); renderSettingsSubView('nodes'); } }
            if (deleteNodeBtn) { e.stopPropagation(); const nodeName = deleteNodeBtn.dataset.node; delete nodes[nodeName]; logActivity(`Deleted Node: "${nodeName}".`); saveState(); selectedSettingsNode = null; renderNavigation(); renderSettingsSubView('nodes'); }
            if (nodeItem) { selectedSettingsNode = nodeItem.dataset.node; renderSettingsSubView('nodes'); }
            
            const addFieldBtn = e.target.closest('#add-field-btn');
            const deleteFieldBtn = e.target.closest('.delete-field-btn');
            const editOptionsBtn = e.target.closest('.edit-options-btn');

            if (addFieldBtn && selectedSettingsNode) { const nameInput = document.getElementById('new-field-name'); const typeInput = document.getElementById('new-field-type'); const newName = nameInput.value.trim(); if (newName && !nodes[selectedSettingsNode].fields.some(f => f.name === newName)) { const newField = { name: newName, type: typeInput.value, required: false, isCore: false }; if(newField.type === 'select') { newField.options = ['Option 1', 'Option 2']; } nodes[selectedSettingsNode].fields.push(newField); nameInput.value = ''; saveState(); renderNodeSpecificSettings(selectedSettingsNode); } }
            if (deleteFieldBtn && selectedSettingsNode) { const fieldIndex = parseInt(deleteFieldBtn.dataset.index); const fieldToDelete = nodes[selectedSettingsNode].fields[fieldIndex]; nodes[selectedSettingsNode].data.forEach(item => delete item[fieldToDelete.name]); nodes[selectedSettingsNode].fields.splice(fieldIndex, 1); saveState(); renderNodeSpecificSettings(selectedSettingsNode); }
            if (editOptionsBtn && selectedSettingsNode) { showOptionsModal(selectedSettingsNode, parseInt(editOptionsBtn.dataset.index)); }

            const addStageBtn = e.target.closest('#add-stage-btn');
            const deleteStageBtn = e.target.closest('.delete-stage-btn');
            if (addStageBtn && selectedSettingsNode) { const nameInput = document.getElementById('new-stage-name'); const newName = nameInput.value.trim(); if (newName && !nodes[selectedSettingsNode].stages.includes(newName)) { nodes[selectedSettingsNode].stages.push(newName); nameInput.value = ''; saveState(); renderNodeSpecificSettings(selectedSettingsNode); } }
            if (deleteStageBtn && selectedSettingsNode) { const stageIndex = parseInt(deleteStageBtn.dataset.index); const stageToDelete = nodes[selectedSettingsNode].stages[stageIndex]; nodes[selectedSettingsNode].data.forEach(item => { if (item.stage === stageToDelete) { item.stage = nodes[selectedSettingsNode].stages[0]; } }); nodes[selectedSettingsNode].stages.splice(stageIndex, 1); saveState(); renderNodeSpecificSettings(selectedSettingsNode); }
            
            const exportCsvBtn = e.target.closest('#export-csv-btn');
            const exportJsonBtn = e.target.closest('#export-json-btn');
            if(exportCsvBtn) {
                const nodeToExport = document.getElementById('export-node-select').value;
                exportToCsv(nodeToExport);
            }
            if(exportJsonBtn) {
                exportToJson();
            }
        });
    }

    function renderTasks() {
        // ... (Tasks logic is unchanged)
    }
    
    function renderView(viewName) {
        currentView = viewName;
        updateActiveNav(viewName);
        const title = viewName.charAt(0).toUpperCase() + viewName.slice(1);
        mobileHeaderTitle.textContent = title;
        mobileAddBtn.style.display = 'none'; // Hide by default
        
        const node = nodes[viewName];
        if (node) {
            mobileAddBtn.style.display = 'block';
            mobileAddBtn.dataset.node = viewName;
            content.innerHTML = getNodeViewTemplate(viewName);
            if (node.view === 'table') { renderNodeTable(viewName); } 
            else if (node.view === 'kanban') { renderNodeKanban(viewName); }
        } else if (viewName === 'dashboard') {
            renderDashboard();
        } else if (viewName === 'tasks') {
            // tasks view logic...
        } else if (viewName === 'settings') {
            renderSettings();
            setupSettingsViewListeners();
        }
        feather.replace();
    }
    
    mainNav.addEventListener('click', e => { const navLink = e.target.closest('.nav-link'); if (navLink) { e.preventDefault(); selectedSettingsNode = null; renderView(navLink.dataset.view); } });
    bottomNav.addEventListener('click', e => { const navLink = e.target.closest('.bottom-nav-link'); if (navLink) { e.preventDefault(); selectedSettingsNode = null; renderView(navLink.dataset.view); } });
    document.querySelector('.p-4.border-t').addEventListener('click', e => { const navLink = e.target.closest('.nav-link'); if (navLink) { e.preventDefault(); selectedSettingsNode = null; renderView(navLink.dataset.view); } });
    
    content.addEventListener('click', e => {
        const addBtn = e.target.closest('#add-node-item-btn');
        const row = e.target.closest('.table-row-hover');
        const editBtn = e.target.closest('.edit-node-item-btn');
        const deleteBtn = e.target.closest('.delete-node-item-btn');
        const convertBtn = e.target.closest('.convert-lead-btn');
        const dealCard = e.target.closest('.deal-card');
        const kanbanTab = e.target.closest('.kanban-tab');

        if(e.target.closest('button')) e.stopPropagation();

        if (addBtn) { showNodeModal(addBtn.dataset.node); }
        if (editBtn) { const item = nodes[editBtn.dataset.node].data.find(i => i.id === parseInt(editBtn.dataset.id)); if (item) showNodeModal(editBtn.dataset.node, item); }
        if (row && !editBtn && !deleteBtn && !convertBtn) { const item = nodes[row.dataset.node].data.find(i => i.id === parseInt(row.dataset.id)); if (item) showNodeModal(row.dataset.node, item); }
        if (deleteBtn) { const nodeName = deleteBtn.dataset.node; const item = nodes[nodeName].data.find(i => i.id === parseInt(deleteBtn.dataset.id)); if(item) logActivity(`${nodeName.slice(0,-1)} "${item.Name}" deleted.`); nodes[nodeName].data = nodes[nodeName].data.filter(i => i.id !== parseInt(deleteBtn.dataset.id)); saveState(); renderNodeTable(nodeName); }
        if (convertBtn) { convertLeadToDeal(parseInt(convertBtn.dataset.id)); }
        if (dealCard) { const item = nodes[dealCard.dataset.node].data.find(i => i.id === parseInt(dealCard.dataset.id)); if (item) showNodeModal(dealCard.dataset.node, item); }
        if (kanbanTab) { currentKanbanStage = kanbanTab.dataset.stage; renderNodeKanban(currentView); }
    });

    mobileAddBtn.addEventListener('click', () => {
        const nodeName = mobileAddBtn.dataset.node;
        if(nodes[nodeName]) {
            showNodeModal(nodeName);
        } else if (currentView === 'tasks') {
            showModal('task-modal');
        }
    });

    document.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', () => hideModal(btn.dataset.modal)));
    nodeModal.addEventListener('click', e => { if(e.target === nodeModal) hideModal('node-modal'); });
    taskModal.addEventListener('click', e => { if(e.target === taskModal) hideModal('task-modal'); });
    optionsModal.addEventListener('click', e => { 
        if(e.target === optionsModal) hideModal('options-modal');
        const addBtn = e.target.closest('#add-option-btn');
        const removeBtn = e.target.closest('.remove-option-btn');
        if (addBtn) {
            const nodeName = document.getElementById('options-node-name').value;
            const fieldIndex = parseInt(document.getElementById('options-field-index').value);
            const input = document.getElementById('new-option-name');
            const newOption = input.value.trim();
            if(newOption && !nodes[nodeName].fields[fieldIndex].options.includes(newOption)) {
                nodes[nodeName].fields[fieldIndex].options.push(newOption);
                saveState();
                input.value = '';
                showOptionsModal(nodeName, fieldIndex);
                renderNodeSpecificSettings(nodeName);
            }
        }
        if(removeBtn) {
            const nodeName = document.getElementById('options-node-name').value;
            const fieldIndex = parseInt(document.getElementById('options-field-index').value);
            const optionIndex = parseInt(removeBtn.dataset.index);
            nodes[nodeName].fields[fieldIndex].options.splice(optionIndex, 1);
            saveState();
            showOptionsModal(nodeName, fieldIndex);
            renderNodeSpecificSettings(nodeName);
        }
    });

    document.getElementById('node-form').addEventListener('submit', (e) => saveNodeItem(e));
    // ... (task form submit listener)

    // --- INITIAL LOAD ---
    loadState();
    renderNavigation();
    renderView('dashboard');
});

