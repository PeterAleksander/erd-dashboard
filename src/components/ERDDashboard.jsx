import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import Papa from 'papaparse';
import _ from 'lodash';
import { Search, Filter, Info, X, ZoomIn, ZoomOut, RefreshCw, Atom, Lock } from 'lucide-react';

// File Uploader Component
function FileUploader({ onFileLoaded }) {
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            alert('Please select a CSV file');
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            const csvContent = e.target.result;
            onFileLoaded(csvContent);
        };

        reader.onerror = () => {
            console.error('Error reading file');
            alert('There was an error reading the file');
        };

        reader.readAsText(file);
    };

    return (
        <div className="p-4 border-2 border-dashed border-gray-300 rounded-md mb-4">
            <label className="block mb-2 font-medium text-sm text-gray-700">
                Upload your database schema CSV file
            </label>

            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
            />

            <p className="mt-2 text-xs text-gray-500">
                The CSV should contain the table structure with columns for table name, schema,
                column name, primary keys, and foreign keys.
            </p>

            <details className="mt-2">
                <summary className="text-xs text-blue-500 cursor-pointer">
                    View expected CSV format
                </summary>
                <div className="p-2 bg-gray-50 rounded mt-1 text-xs font-mono overflow-x-auto">
                    <code>
                        TableName,Schema,ColumnName,DataType,Size,Precision,IsPrimaryKey,IsForeignKey,ReferencedTable,ReferencedColumn<br />
                        Customer,dbo,CustomerID,int,4,0,1,0,NULL,NULL<br />
                        Customer,dbo,Name,varchar,50,0,0,0,NULL,NULL<br />
                        Order,dbo,OrderID,int,4,0,1,0,NULL,NULL<br />
                        Order,dbo,CustomerID,int,4,0,0,1,Customer,CustomerID<br />
                    </code>
                </div>
            </details>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r mb-4">
                <h3 className="font-medium text-amber-800 mb-2 flex items-center">
                    <span className="mr-2">📋</span> To Do List
                </h3>
                <ol className="list-decimal ml-6 space-y-2 text-amber-900 text-left">
                    <li>Add Dictionary for Common Type Table Definitions
                        <ol>
                            <li>TranCodes</li>
                        </ol>
                    </li>
                    <li>Add Guide for CSV Export from DB</li>
                    <li>Disable Broken Physics Toggle</li>
                </ol>
            </div>
        </div>

    );
}

function ERDDashboard() {
    const [tables, setTables] = useState([]);
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchema, setSelectedSchema] = useState('All');
    const [schemas, setSchemas] = useState(['All']);
    const [nodePositions, setNodePositions] = useState({});
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isPhysicsEnabled, setIsPhysicsEnabled] = useState(false);
    const [draggingNode, setDraggingNode] = useState(null);
    const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);
    const physicsTimerRef = useRef(null);

    // Process CSV data
    function processCSVData(csvContent) {
        try {
            setLoading(true);

            // Parse CSV
            const parsedData = Papa.parse(csvContent, {
                header: false,
                skipEmptyLines: true
            });

            // Process data into tables
            const tablesMap = new Map();

            parsedData.data.forEach(row => {
                if (!row[0] || !row[2]) return; // Skip incomplete rows

                const tableName = row[0];
                const schema = row[1];
                const columnName = row[2];
                const isPrimaryKey = row[6] === "1";
                const isForeignKey = row[7] === "1";
                const referencedTable = row[8];
                const referencedColumn = row[9];

                // Add table if not exists
                const fullTableName = `${schema}.${tableName}`;
                if (!tablesMap.has(fullTableName)) {
                    tablesMap.set(fullTableName, {
                        name: tableName,
                        schema: schema,
                        fullName: fullTableName,
                        columns: [],
                        primaryKeys: [],
                        foreignKeys: []
                    });
                }

                const table = tablesMap.get(fullTableName);

                // Add column
                const column = {
                    name: columnName,
                    isPrimaryKey: isPrimaryKey,
                    isForeignKey: isForeignKey,
                    referencedTable: referencedTable !== "NULL" ? referencedTable : null,
                    referencedColumn: referencedColumn !== "NULL" ? referencedColumn : null
                };

                table.columns.push(column);

                if (column.isPrimaryKey) {
                    table.primaryKeys.push(column.name);
                }

                if (column.isForeignKey && column.referencedTable) {
                    table.foreignKeys.push({
                        column: column.name,
                        referencedTable: column.referencedTable,
                        referencedColumn: column.referencedColumn
                    });
                }
            });

            // Convert to arrays
            const tableArray = Array.from(tablesMap.values());
            const relationshipsArray = [];

            tableArray.forEach(table => {
                table.foreignKeys.forEach(fk => {
                    if (fk.referencedTable) {
                        relationshipsArray.push({
                            source: table.fullName,
                            sourceColumn: fk.column,
                            target: fk.referencedTable,
                            targetColumn: fk.referencedColumn
                        });
                    }
                });
            });

            // Extract schemas
            const uniqueSchemas = _.uniq(tableArray.map(table => table.schema)).sort();

            setTables(tableArray);
            setRelationships(relationshipsArray);
            setSchemas(['All', ...uniqueSchemas]);
            setLoading(false);
        } catch (error) {
            console.error('Error processing CSV data:', error);
            setLoading(false);
        }
    }

    // Filter tables based on search and schema
    const filteredTables = tables.filter(table => {
        const matchesSearch = table.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSchema = selectedSchema === 'All' || table.schema === selectedSchema;
        return matchesSearch && matchesSchema;
    });

    // Group tables by schema
    const tablesBySchema = _.groupBy(filteredTables, 'schema');

    // Get relationships for selected table
    function getTableRelationships() {
        if (!selectedTable) return [];

        return relationships.filter(rel =>
            rel.source === selectedTable.fullName ||
            rel.target === selectedTable.fullName ||
            rel.target === selectedTable.name
        );
    }

    // Initialize node positions
    useEffect(() => {
        if (!selectedTable) return;

        const tableRels = getTableRelationships();
        if (tableRels.length === 0) return;

        // Create nodes list
        const nodes = [];
        const visited = new Set();

        // Add center node
        nodes.push({
            id: selectedTable.fullName,
            isCenter: true
        });
        visited.add(selectedTable.fullName);

        // Add related tables
        tableRels.forEach(rel => {
            const isOutgoing = rel.source === selectedTable.fullName;
            const relatedId = isOutgoing ? rel.target : rel.source;

            const relatedTable = tables.find(t =>
                t.fullName === relatedId || t.name === relatedId
            );

            if (relatedTable && !visited.has(relatedTable.fullName)) {
                nodes.push({
                    id: relatedTable.fullName,
                    isOutgoing: isOutgoing
                });
                visited.add(relatedTable.fullName);
            }
        });

        // Set positions
        const newPositions = {};

        // Center node
        newPositions[selectedTable.fullName] = { x: 1200, y: 900 };

        // Other nodes in a circle
        const otherNodes = nodes.filter(n => !n.isCenter);
        const radius = Math.min(450, 150 + otherNodes.length * 15);

        otherNodes.forEach((node, i) => {
            // Keep existing positions
            if (nodePositions[node.id]) {
                newPositions[node.id] = nodePositions[node.id];
                return;
            }

            // Calculate position in a circle
            const angle = (i * 2 * Math.PI) / otherNodes.length;

            newPositions[node.id] = {
                x: 1200 + radius * Math.cos(angle),
                y: 900 + radius * Math.sin(angle)
            };
        });

        setNodePositions(newPositions);
    }, [selectedTable, relationships, tables]);

    // Physics simulation
    useEffect(() => {
        if (!isPhysicsEnabled || !selectedTable) {
            if (physicsTimerRef.current) {
                clearInterval(physicsTimerRef.current);
                physicsTimerRef.current = null;
            }
            return;
        }

        const tableRels = getTableRelationships();

        physicsTimerRef.current = setInterval(() => {
            setNodePositions(prevPositions => {
                const newPositions = { ...prevPositions };

                // Apply repulsive forces
                Object.entries(newPositions).forEach(([id1, pos1]) => {
                    Object.entries(newPositions).forEach(([id2, pos2]) => {
                        if (id1 === id2) return;

                        const dx = pos2.x - pos1.x;
                        const dy = pos2.y - pos1.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        if (distance > 300) return;

                        const force = 1000 / (distance * distance);
                        const cappedForce = Math.min(force, 7);
                        const moveX = (dx / distance) * cappedForce;
                        const moveY = (dy / distance) * cappedForce;

                        if (id2 !== selectedTable.fullName) {
                            newPositions[id2].x += moveX;
                            newPositions[id2].y += moveY;
                        }
                    });
                });

                // Apply attractive forces
                tableRels.forEach(rel => {
                    const sourceTable = tables.find(t =>
                        t.fullName === rel.source || t.name === rel.source
                    );
                    const targetTable = tables.find(t =>
                        t.fullName === rel.target || t.name === rel.target
                    );

                    if (!sourceTable || !targetTable) return;

                    const sourceId = sourceTable.fullName;
                    const targetId = targetTable.fullName;

                    if (!newPositions[sourceId] || !newPositions[targetId]) return;

                    const dx = newPositions[targetId].x - newPositions[sourceId].x;
                    const dy = newPositions[targetId].y - newPositions[sourceId].y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 100) return;

                    const force = (distance - 180) * 0.015;
                    const moveX = (dx / distance) * force;
                    const moveY = (dy / distance) * force;

                    if (sourceId !== selectedTable.fullName) {
                        newPositions[sourceId].x += moveX;
                        newPositions[sourceId].y += moveY;
                    }

                    if (targetId !== selectedTable.fullName) {
                        newPositions[targetId].x -= moveX;
                        newPositions[targetId].y -= moveY;
                    }
                });

                // Keep nodes within bounds
                Object.keys(newPositions).forEach(id => {
                    if (id !== selectedTable.fullName) {
                        newPositions[id].x = Math.max(100, Math.min(2300, newPositions[id].x));
                        newPositions[id].y = Math.max(100, Math.min(1700, newPositions[id].y));
                    }
                });

                return newPositions;
            });
        }, 50);

        return () => {
            clearInterval(physicsTimerRef.current);
            physicsTimerRef.current = null;
        };
    }, [isPhysicsEnabled, selectedTable, relationships, tables]);

    // Handle node dragging
    function startDrag(e, nodeId) {
        if (!svgRef.current || !nodeId) return;

        e.preventDefault();
        e.stopPropagation();

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        setDraggingNode(nodeId);
        setDragStartPos({ x: svgP.x, y: svgP.y });
    }

    function handleDrag(e) {
        if (!draggingNode || !svgRef.current) return;

        e.preventDefault();
        e.stopPropagation();

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        const dx = svgP.x - dragStartPos.x;
        const dy = svgP.y - dragStartPos.y;

        setNodePositions(prev => {
            const updatedPos = { ...prev };
            if (updatedPos[draggingNode]) {
                updatedPos[draggingNode] = {
                    x: updatedPos[draggingNode].x + dx,
                    y: updatedPos[draggingNode].y + dy
                };
            }
            return updatedPos;
        });

        setDragStartPos({ x: svgP.x, y: svgP.y });
    }

    function endDrag() {
        setDraggingNode(null);
    }

    // Zoom controls
    function zoomIn() {
        setZoomLevel(prev => Math.min(prev * 1.2, 2));
    }

    function zoomOut() {
        setZoomLevel(prev => Math.max(prev * 0.8, 0.5));
    }

    function resetView() {
        setZoomLevel(1);
        setNodePositions({});
    }

    // Toggle physics
    function togglePhysics() {
        setIsPhysicsEnabled(prev => !prev);
    }

    // Table node component
    function TableNode({ table, isSelected }) {
        return (
            <div
                className={`p-3 rounded shadow my-2 border-2 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} cursor-pointer`}
                onClick={() => setSelectedTable(table)}
            >
                <div className="font-medium truncate text-sm">{table.name}</div>
                <div className="text-xs text-gray-500 truncate">{table.schema}</div>
                <div className="flex items-center mt-1 text-xs">
                    <span className="mr-1 text-yellow-600">🔑</span>
                    <span>{table.primaryKeys.length}</span>
                    <span className="mx-2 text-blue-600">🔗</span>
                    <span>{table.foreignKeys.length}</span>
                </div>
            </div>
        );
    }

    // Table detail component
    function TableDetails() {
        if (!selectedTable) return null;

        return (
            <Card className="mb-4">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-md font-medium">
                        {selectedTable.schema}.{selectedTable.name}
                    </CardTitle>
                    <button
                        onClick={() => setSelectedTable(null)}
                        className="rounded-full p-1 hover:bg-gray-200"
                    >
                        <X size={16} />
                    </button>
                </CardHeader>
                <CardContent className="py-2">
                    <div className="flex flex-wrap gap-4">
                        <div className="flex-1 min-w-64">
                            <div className="text-sm mb-3">
                                <div className="font-medium text-left">Primary Keys:</div>
                                <div className="ml-2">
                                    {selectedTable.primaryKeys.length > 0 ?
                                        selectedTable.primaryKeys.map(pk => (
                                            <div key={pk} className="flex items-center">
                                                <span className="mr-2 text-yellow-600">🔑</span> {pk}
                                            </div>
                                        )) :
                                        <div className="text-gray-500 italic">No primary keys defined</div>
                                    }
                                </div>
                            </div>

                            <div className="text-sm">
                                <div className="font-medium text-left">Foreign Keys:</div>
                                <div className="ml-2">
                                    {selectedTable.foreignKeys.length > 0 ?
                                        selectedTable.foreignKeys.map(fk => (
                                            <div key={`${fk.column}-${fk.referencedTable}`} className="flex items-center mb-1">
                                                <span className="mr-2 text-blue-600">🔗</span>
                                                <span>{fk.column} → {fk.referencedTable}.{fk.referencedColumn}</span>
                                            </div>
                                        )) :
                                        <div className="text-gray-500 italic">No foreign keys defined</div>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ERD Visualization Component
    function Visualization() {
        if (!selectedTable) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center p-4">
                        <Info size={40} className="mx-auto mb-2 text-gray-400" />
                        <div>Select a table to view relationships</div>
                    </div>
                </div>
            );
        }

        const tableRels = getTableRelationships();

        if (tableRels.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center p-4">
                        <Info size={40} className="mx-auto mb-2 text-gray-400" />
                        <div>No relationships found for this table</div>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative h-full">
                {/* Controls */}
                <div className="absolute top-2 right-2 z-10 flex bg-white p-1 rounded shadow">
                    <button className="p-1 rounded hover:bg-gray-100" onClick={zoomIn} title="Zoom In">
                        <ZoomIn size={20} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100" onClick={zoomOut} title="Zoom Out">
                        <ZoomOut size={20} />
                    </button>
                    <button className="p-1 rounded hover:bg-gray-100" onClick={resetView} title="Reset View">
                        <RefreshCw size={20} />
                    </button>
                    <button
                        className={`p-1 rounded hover:bg-gray-100 ${isPhysicsEnabled ? 'bg-blue-50' : ''}`}
                        onClick={togglePhysics}
                        title={isPhysicsEnabled ? "Disable Physics" : "Enable Physics"}
                    >
                        {isPhysicsEnabled ? <Lock size={20} /> : <Atom size={20} />}
                    </button>
                </div>

                {/* Physics status notification */}
                {isPhysicsEnabled && (
                    <div className="absolute top-2 left-2 bg-blue-50 p-2 rounded shadow text-xs border border-blue-200">
                        <div className="font-medium flex items-center">
                            <Atom size={12} className="mr-1" /> Physics enabled
                        </div>
                        <div className="text-gray-600 mt-1">
                            Tables will automatically position to reduce overlap
                        </div>
                    </div>
                )}

                <div className="w-full h-full overflow-auto"
                    style={{ cursor: draggingNode ? 'grabbing' : 'default' }}>
                    <div className="relative"
                        style={{
                            width: '100%',
                            height: '100%',
                            transform: `scale(${zoomLevel})`,
                            transformOrigin: 'center',
                            transition: 'transform 0.2s ease-out'
                        }}>
                        <svg
                            ref={svgRef}
                            width="100%"
                            height="100%"
                            viewBox="0 0 2400 1800"
                            preserveAspectRatio="xMidYMid meet"
                            onMouseMove={handleDrag}
                            onMouseUp={endDrag}
                            onMouseLeave={endDrag}
                        >
                            {/* Arrow markers */}
                            <defs>
                                <marker
                                    id="arrow-outgoing"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#0066cc" />
                                </marker>
                                <marker
                                    id="arrow-incoming"
                                    markerWidth="10"
                                    markerHeight="7"
                                    refX="9"
                                    refY="3.5"
                                    orient="auto"
                                >
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#cc6600" />
                                </marker>
                            </defs>

                            {/* Relationship lines */}
                            {tableRels.map((rel, index) => {
                                const isOutgoing = rel.source === selectedTable.fullName;

                                // Find table details
                                const sourceTable = tables.find(t => t.fullName === rel.source || t.name === rel.source);
                                const targetTable = tables.find(t => t.fullName === rel.target || t.name === rel.target);

                                if (!sourceTable || !targetTable) return null;

                                // Get positions
                                const sourcePos = nodePositions[sourceTable.fullName] || { x: 1200, y: 900 };
                                const targetPos = nodePositions[targetTable.fullName] || { x: 1400, y: 900 };

                                // Calculate curved path
                                const dx = targetPos.x - sourcePos.x;
                                const dy = targetPos.y - sourcePos.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);

                                const midX = sourcePos.x + dx * 0.5;
                                const midY = sourcePos.y + dy * 0.5;

                                // Add curve
                                const perpX = -dy / dist * 30;
                                const perpY = dx / dist * 30;

                                const ctrlX = midX + perpX;
                                const ctrlY = midY + perpY;

                                return (
                                    <g key={`rel-${index}`}>
                                        <path
                                            d={`M ${sourcePos.x},${sourcePos.y} Q ${ctrlX},${ctrlY} ${targetPos.x},${targetPos.y}`}
                                            stroke={isOutgoing ? "#0066cc" : "#cc6600"}
                                            strokeWidth="1.5"
                                            fill="none"
                                            markerEnd={`url(#arrow-${isOutgoing ? 'outgoing' : 'incoming'})`}
                                        />

                                        {/* Column label */}
                                        <rect
                                            x={ctrlX - 40}
                                            y={ctrlY - 10}
                                            width="80"
                                            height="20"
                                            fill="white"
                                            opacity="0.8"
                                            rx="4"
                                        />
                                        <text
                                            x={ctrlX}
                                            y={ctrlY}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize="10"
                                            fill="#333"
                                        >
                                            {isOutgoing ? rel.sourceColumn : rel.targetColumn}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Table nodes */}
                            {Object.entries(nodePositions).map(([nodeId, pos]) => {
                                const table = tables.find(t => t.fullName === nodeId);
                                if (!table) return null;

                                const isCenter = nodeId === selectedTable.fullName;

                                // Style based on relationship
                                const relType = tableRels.find(r => r.source === nodeId || r.target === nodeId);
                                const isOutgoing = relType && relType.source === nodeId;

                                let bgColor = "#f0f0f0";
                                let borderColor = "#666666";

                                if (isCenter) {
                                    bgColor = "#e6f3ff";
                                    borderColor = "#0066cc";
                                } else if (isOutgoing) {
                                    bgColor = "#e6fff2";
                                    borderColor = "#00cc66";
                                } else {
                                    bgColor = "#fff2e6";
                                    borderColor = "#cc6600";
                                }

                                return (
                                    <g
                                        key={nodeId}
                                        transform={`translate(${pos.x}, ${pos.y})`}
                                    >
                                        {/* Node rectangle */}
                                        <rect
                                            x="-70"
                                            y="-25"
                                            width="140"
                                            height="50"
                                            rx="4"
                                            fill={bgColor}
                                            stroke={borderColor}
                                            strokeWidth="2"
                                            style={{ cursor: isCenter ? 'default' : 'pointer' }}
                                            onClick={() => !isCenter && setSelectedTable(table)}
                                        />

                                        {/* Table name */}
                                        <text
                                            y="-5"
                                            textAnchor="middle"
                                            fontSize="12"
                                            fontWeight="bold"
                                            fill="#333"
                                            pointerEvents="none"
                                        >
                                            {table.name.length > 16 ? table.name.substring(0, 14) + "..." : table.name}
                                        </text>

                                        {/* Schema name */}
                                        <text
                                            y="15"
                                            textAnchor="middle"
                                            fontSize="10"
                                            fill="#666"
                                            pointerEvents="none"
                                        >
                                            {table.schema}
                                        </text>

                                        {/* Drag handle */}
                                        {!isCenter && (
                                            <circle
                                                cx="65"
                                                cy="-20"
                                                r="8"
                                                fill="#ddd"
                                                stroke="#999"
                                                strokeWidth="1"
                                                style={{ cursor: 'move' }}
                                                onMouseDown={(e) => startDrag(e, nodeId)}
                                            >
                                                <title>Drag to move</title>
                                            </circle>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow text-xs">
                    <div className="font-medium mb-1">Legend:</div>
                    <div className="flex items-center mb-1">
                        <div className="w-3 h-3 bg-blue-100 border border-blue-500 mr-1"></div>
                        <span>Selected Table</span>
                    </div>
                    <div className="flex items-center mb-1">
                        <div className="w-3 h-3 bg-green-100 border border-green-600 mr-1"></div>
                        <span>Referenced Tables</span>
                    </div>
                    <div className="flex items-center mb-1">
                        <div className="w-3 h-3 bg-orange-100 border border-orange-600 mr-1"></div>
                        <span>Referencing Tables</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3 h-3 bg-gray-300 border border-gray-500 mr-1 rounded-full"></div>
                        <span>Drag handle</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen">
            <Card className="mb-4">
                <CardHeader className="pb-2">
                    <CardTitle>Database Entity-Relationship Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                    {tables.length === 0 && (
                        <FileUploader onFileLoaded={processCSVData} />
                    )}

                    {tables.length > 0 && (
                        <>
                            <div className="text-sm text-gray-500 mb-4">
                                Interactive visualization of database tables, highlighting primary keys, foreign keys, and table relationships.
                            </div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <div className="flex-1 min-w-64">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search tables..."
                                            className="w-full pl-8 pr-4 py-2 border rounded"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="w-40">
                                    <div className="relative">
                                        <Filter className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                        <select
                                            className="w-full pl-8 pr-4 py-2 border rounded appearance-none bg-white"
                                            value={selectedSchema}
                                            onChange={(e) => setSelectedSchema(e.target.value)}
                                        >
                                            {schemas.map(schema => (
                                                <option key={schema} value={schema}>{schema}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="text-sm mb-2">
                                <span className="font-medium">Total Tables:</span> {tables.length} |
                                <span className="font-medium ml-2">Filtered:</span> {filteredTables.length} |
                                <span className="font-medium ml-2">Relationships:</span> {relationships.length}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {tables.length === 0 ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50 border rounded">
                    <div className="text-center p-8">
                        <h3 className="text-lg font-medium text-gray-700 mb-2">No Data Loaded</h3>
                        <p className="text-gray-500 mb-4">Upload a CSV file to visualize your database schema</p>
                        <Info size={48} className="mx-auto text-gray-300" />
                    </div>
                </div>
            ) : (
                <div className="flex flex-1 gap-4 overflow-hidden">
                    {/* Left panel: Table list with fixed height and scrolling */}
                    <div className="w-64 border rounded bg-gray-50 flex flex-col">
                        <div className="p-2 font-medium border-b bg-gray-100">Tables</div>
                        <div className="overflow-y-auto flex-1">
                            {loading ? (
                                <div className="text-center py-4">Loading...</div>
                            ) : (
                                filteredTables.length > 0 ? (
                                    <div className="p-2">
                                        {Object.keys(tablesBySchema).sort().map(schema => (
                                            <div key={schema} className="mb-4">
                                                <div className="text-xs font-medium bg-gray-200 p-1 rounded mb-1">
                                                    {schema}
                                                </div>
                                                {tablesBySchema[schema].map(table => (
                                                    <TableNode
                                                        key={table.fullName}
                                                        table={table}
                                                        isSelected={selectedTable && selectedTable.fullName === table.fullName}
                                                    />
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4 text-gray-500">No tables match your filters</div>
                                )
                            )}
                        </div>
                    </div>

                    {/* Right panel: Details and visualization */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Table details */}
                        {selectedTable && <TableDetails />}

                        {/* ERD Visualization */}
                        <div className="flex-1 border rounded overflow-hidden relative bg-white">
                            {loading ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center">
                                        <div className="mb-2">Loading database schema...</div>
                                        <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin mx-auto"></div>
                                    </div>
                                </div>
                            ) : (
                                <Visualization />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ERDDashboard;