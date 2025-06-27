"use client"

import { useEffect, useState, useDeferredValue, useMemo } from "react"
import axios from "axios"
import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate, Link } from "react-router-dom"
import {
    Container,
    Row,
    Col,
    Card,
    Table,
    Button,
    Form,
    Badge,
    Dropdown,
    Nav,
    Alert,
    Spinner,
    InputGroup,
    Pagination,
    Modal,
    Navbar,
    Offcanvas,
} from "react-bootstrap"
import {
    BsPersonFill,
    BsBoxSeam,
    BsCartFill,
    BsTagFill,
    BsBarChartFill,
    BsSearch,
    BsPlus,
    BsPencil,
    BsTrash,
    BsCheck,
    BsX,
    BsExclamationTriangle,
    BsCurrencyDollar,
    BsShop,
    BsPower,
    BsChatDots,
    BsList,
    BsEye,
    BsFilter,
    BsDownload,
    BsUpload,
    BsGear,
    BsBell,
    BsCalendar,
    BsGraphUpArrow,
    BsArrowUp,
    BsCart,
    BsClipboardCheck,
    BsListUl,
    BsBoxArrowRight,
    BsPerson,
    BsArrowLeft,
    BsArrowRight,
    BsBarChart,
    BsCheckCircle,
} from "react-icons/bs"
import ChatPage from "./ChatPage.jsx"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const userRole = localStorage.getItem("role")
const AdminPage = () => {
    const navigate = useNavigate()
    const role = localStorage.getItem("role")

    // Main State Management
    const [activeTab, setActiveTab] = useState("dashboard")
    const [users, setUsers] = useState([])
    const [items, setItems] = useState([])
    const [orders, setOrders] = useState([])
    const [categories, setCategories] = useState([])
    const [furnitureTypes, setFurnitureTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState("")
    const [selectedItem, setSelectedItem] = useState(null)
    const [showSidebar, setShowSidebar] = useState(false)

    // Delivery proof upload states
    const [showDeliveryModal, setShowDeliveryModal] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [deliveryProofFile, setDeliveryProofFile] = useState(null)
    const [uploadingProof, setUploadingProof] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Form states
    const [editItemId, setEditItemId] = useState(null)
    const [addItemMode, setAddItemMode] = useState(false)
    const [editUserId, setEditUserId] = useState(null)
    const [editingCategory, setEditingCategory] = useState(null)
    const [editingFurnitureType, setEditingFurnitureType] = useState(null)

    // Modal states for item editing
    const [showEditModal, setShowEditModal] = useState(false)
    const [editingItem, setEditingItem] = useState(null)

    const blankForm = {
        name: "",
        description: "",
        cost: "",
        price: "", // Added missing price field
        stock: 0,
        category: [],
        furnituretype: "",
        length: 0, // Changed from empty string to 0
        height: 0, // Changed from empty string to 0
        width: 0, // Changed from empty string to 0
        images: null,
        is_bestseller: false,
        isPackage: false,
        // --- Customization Defaults ---
        is_customizable: false,
        labor_cost_per_day: 350,
        profit_margin: 0.5,
        overhead_cost: 500,
        estimated_days: 7,
        materials: [], // [{name, plank_2x12x10_cost, plank_3x3x10_cost}]
    }
    const [itemForm, setItemForm] = useState({ ...blankForm })
    const [userForm, setUserForm] = useState({ name: "", email: "" })
    const [newCategoryName, setNewCategoryName] = useState("")
    const [newFurnitureTypeName, setNewFurnitureTypeName] = useState("")

    // Desktop sidebar collapse state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    // Centralized API Calls
    const fetchData = async () => {
        setLoading(true)
        const token = localStorage.getItem("token")
        const headers = { Authorization: `Bearer ${token}` }
        try {
            console.log("=== FETCHING ADMIN DASHBOARD DATA ===")
            console.log("Token available:", !!token)

            const [usersRes, itemsRes, ordersRes, categoriesRes, furnitureTypesRes] = await Promise.all([
                axios.get(`${BACKEND_URL}/api/allusers`, { headers }),
                axios.get(`${BACKEND_URL}/api/items`),
                axios.get(`${BACKEND_URL}/api/orders`, { headers }),
                axios.get(`${BACKEND_URL}/api/categories`),
                axios.get(`${BACKEND_URL}/api/furnituretypes`),
            ])

            console.log("=== API RESPONSES RECEIVED ===")
            console.log("Users count:", usersRes.data.UserData?.length || 0)
            console.log("Items count:", itemsRes.data.ItemData?.length || 0)
            console.log("Orders count:", ordersRes.data.OrderData?.length || 0)
            console.log("Categories count:", categoriesRes.data.CategoryData?.length || 0)
            console.log("Furniture types count:", furnitureTypesRes.data.FurnitureTypeData?.length || 0)

            setUsers(usersRes.data.UserData || [])
            setItems(itemsRes.data.ItemData || [])
            setOrders(ordersRes.data.OrderData || [])
            setCategories(categoriesRes.data.CategoryData || [])
            setFurnitureTypes(furnitureTypesRes.data.FurnitureTypeData || [])

            // Log customized orders analysis
            const customizedOrders = ordersRes.data.OrderData?.filter(order =>
                order.items?.some(item => item.item?.is_customizable)
            ) || []

            console.log("=== CUSTOMIZED ORDERS ANALYSIS ===")
            console.log("Total customized orders:", customizedOrders.length)
            console.log("Customized orders breakdown:", customizedOrders.map(order => ({
                id: order._id,
                customer: order.user?.name,
                status: order.status,
                amount: order.amount,
                customizedItems: order.items?.filter(item => item.item?.is_customizable).map(item => ({
                    name: item.item?.name,
                    price: item.price,
                    quantity: item.quantity,
                    materials: item.item?.materials
                }))
            })))

        } catch (err) {
            console.error("=== ERROR FETCHING DASHBOARD DATA ===")
            console.error("Error details:", err)
            console.error("Error response:", err.response?.data)
            alert("Failed to fetch data. Please check your connection or permissions.")
        } finally {
            setLoading(false)
            console.log("=== DASHBOARD DATA LOADING COMPLETED ===")
        }
    }

    useEffect(() => {
        if (role !== "admin") {
            alert("Access denied. Admins only.")
            navigate("/home")
        } else {
            fetchData()
        }
    }, [role, navigate])

    // Logout handler
    const handleLogout = () => {
        localStorage.removeItem("token")
        localStorage.removeItem("role")
        navigate("/login")
    }

    // Dashboard View Component
    const DashboardView = () => {
        const totalSales = orders
            .filter((o) => o.status === "On Process" || o.status === "Delivered")
            .reduce((sum, o) => sum + o.amount, 0)

        const lowStockItems = items.filter((item) => item.stock < 5)
        const recentOrders = orders.slice(0, 5)
        const pendingOrders = orders.filter((o) => o.status === "On Process").length
        const completedOrders = orders.filter((o) => o.status === "Delivered").length

        return (

            <div>

                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Dashboard Overview</h2>
                        <p className="text-muted mb-0">Welcome back! Here's what's happening with your store today.</p>
                    </div>
                    <div className="d-flex gap-2">

                        <Button variant="primary" size="sm" onClick={fetchData}>
                            <BsSearch className="me-1" />
                            Refresh
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <Row className="g-4 mb-4">
                    <Col xl={3} lg={6} md={6}>
                        <Card
                            className="border-0 shadow-sm h-100"
                            style={{
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                color: "white",
                            }}
                        >
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h3 className="fw-bold mb-1 text-white">{users.length}</h3>
                                        <p className="mb-0 text-white-50">Total Users</p>
                                        <small className="text-white-50">
                                            <BsArrowUp className="me-1" />
                                            +12% from last month
                                        </small>
                                    </div>
                                    <div className="p-3 rounded-circle" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                                        <BsPersonFill size={24} color="white" />
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <Card
                            className="border-0 shadow-sm h-100"
                            style={{
                                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                                color: "white",
                            }}
                        >
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h3 className="fw-bold mb-1 text-white">{items.length}</h3>
                                        <p className="mb-0 text-white-50">Total Products</p>
                                        <small className="text-white-50">
                                            <BsArrowUp className="me-1" />
                                            +8% from last month
                                        </small>
                                    </div>
                                    <div className="p-3 rounded-circle" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                                        <BsBoxSeam size={24} color="white" />
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <Card
                            className="border-0 shadow-sm h-100"
                            style={{
                                background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                                color: "white",
                            }}
                        >
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h3 className="fw-bold mb-1 text-white">{orders.length}</h3>
                                        <p className="mb-0 text-white-50">Total Orders</p>
                                        <small className="text-white-50">
                                            <BsArrowUp className="me-1" />
                                            +23% from last month
                                        </small>
                                    </div>
                                    <div className="p-3 rounded-circle" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                                        <BsCartFill size={24} color="white" />
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xl={3} lg={6} md={6}>
                        <Card
                            className="border-0 shadow-sm h-100"
                            style={{
                                background: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                                color: "white",
                            }}
                        >
                            <Card.Body>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h3 className="fw-bold mb-1 text-white">{totalSales.toLocaleString()}</h3>
                                        <p className="mb-0 text-white-50">Total Revenue</p>
                                        <small className="text-white-50">
                                            <BsArrowUp className="me-1" />
                                            +15% from last month
                                        </small>
                                    </div>
                                    <div className="p-3 rounded-circle" style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}>
                                        <BsCurrencyDollar size={24} color="white" />
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Quick Stats Row */}
                <Row className="g-4 mb-4">
                    <Col lg={3} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <Card.Body>
                                <div className="text-warning mb-2">
                                    <BsBell size={32} />
                                </div>
                                <h4 className="fw-bold text-warning">{pendingOrders}</h4>
                                <p className="text-muted mb-0">Pending Orders</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <Card.Body>
                                <div className="text-success mb-2">
                                    <BsCheck size={32} />
                                </div>
                                <h4 className="fw-bold text-success">{completedOrders}</h4>
                                <p className="text-muted mb-0">Completed Orders</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <Card.Body>
                                <div className="text-danger mb-2">
                                    <BsExclamationTriangle size={32} />
                                </div>
                                <h4 className="fw-bold text-danger">{lowStockItems.length}</h4>
                                <p className="text-muted mb-0">Low Stock Items</p>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={3} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <Card.Body>
                                <div className="text-info mb-2">
                                    <BsGraphUpArrow size={32} />
                                </div>
                                <h4 className="fw-bold text-info">{categories.length}</h4>
                                <p className="text-muted mb-0">Categories</p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>

                {/* Main Content Row */}
                <Row className="g-4">
                    <Col lg={8}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className="bg-white border-bottom-0 py-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0 fw-bold">Recent Orders</h5>
                                    <Button variant="outline-primary" size="sm" onClick={() => setActiveTab("orders")}>
                                        <BsEye className="me-1" />
                                        View All
                                    </Button>
                                </div>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <div className="table-responsive">
                                    <Table className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="border-0 fw-semibold">Order ID</th>
                                                <th className="border-0 fw-semibold">Customer</th>
                                                <th className="border-0 fw-semibold">Amount</th>
                                                <th className="border-0 fw-semibold">Status</th>
                                                <th className="border-0 fw-semibold">Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentOrders.map((order) => (
                                                <tr key={order._id} className="border-bottom">
                                                    <td className="py-3">
                                                        <span className="font-monospace text-muted small">#{order._id.slice(-6)}</span>
                                                    </td>
                                                    <td className="py-3">
                                                        <div>
                                                            <div className="fw-medium">{order.user?.name || "N/A"}</div>
                                                            <small className="text-muted">{order.user?.email}</small>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <span className="fw-bold">₱{order.amount.toLocaleString()}</span>
                                                    </td>
                                                    <td className="py-3">
                                                        <Badge bg={getStatusVariant(order.status)} className="text-capitalize px-3 py-2">
                                                            {order.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3">
                                                        <div className="text-muted small">
                                                            <BsCalendar className="me-1" />
                                                            {new Date(order.createdAt).toLocaleDateString()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col lg={4}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className="bg-white border-bottom-0 py-3">
                                <h5 className="mb-0 fw-bold">
                                    <BsExclamationTriangle className="text-warning me-2" />
                                    Inventory Alerts
                                </h5>
                            </Card.Header>
                            <Card.Body>
                                {lowStockItems.length > 0 ? (
                                    <div>
                                        <Alert variant="warning" className="py-2 mb-3">
                                            <BsExclamationTriangle className="me-2" />
                                            {lowStockItems.length} items need restocking!
                                        </Alert>
                                        <div className="d-grid gap-2">
                                            {lowStockItems.slice(0, 5).map((item) => (
                                                <div
                                                    key={item._id}
                                                    className="d-flex justify-content-between align-items-center p-3 bg-light rounded"
                                                >
                                                    <div>
                                                        <div className="fw-medium">{item.name}</div>
                                                        <small className="text-muted">Current stock: {item.stock}</small>
                                                    </div>
                                                    <Badge bg="danger" className="px-3 py-2">
                                                        {item.stock}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                        {lowStockItems.length > 5 && (
                                            <div className="text-center mt-3">
                                                <Button variant="outline-warning" size="sm" onClick={() => setActiveTab("items")}>
                                                    View All Low Stock Items
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="text-success mb-3">
                                            <BsCheck size={48} />
                                        </div>
                                        <h6 className="text-success">All Good!</h6>
                                        <p className="text-muted mb-0">All items are well stocked</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }

    // Helper function for status variants
    const getStatusVariant = (status) => {
        switch (status) {
            case "On Process":
                return "primary"
            case "Delivered":
                return "success"
            case "Requesting for Refund":
                return "info"
            case "Refunded":
                return "danger"
            case "Completed":
                return "success"
            default:
                return "secondary"
        }
    }

    // Order Management View
    const OrderManagementView = () => {
        // Local deferred search state
        const [searchTerm, setSearchTerm] = useState("")
        const deferredSearchTerm = useDeferredValue(searchTerm)
        const [statusFilter, setStatusFilter] = useState("all")

        const handleStatusChange = async (orderId, newStatus) => {
            if (!window.confirm(`Change status to "${newStatus}"?`)) return
            try {
                const token = localStorage.getItem("token")
                const newStatusRes = await axios.put(`${BACKEND_URL}/api/orders/${orderId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } })
                fetchData()
            } catch (err) {
                console.error("Error updating order status:", err)
                alert("Failed to update status.")
            }
        }

        const handleUploadDeliveryProof = (order) => {
            setSelectedOrder(order)
            setShowDeliveryModal(true)
        }

        const handleDeliveryProofSubmit = async () => {
            if (!deliveryProofFile || !selectedOrder) {
                alert("Please select an image file first.")
                return
            }

            // Optional: Keep file size check as it's good practice
            if (deliveryProofFile.size > 10 * 1024 * 1024) {
                alert("Image is too large. Please select an image smaller than 10MB.")
                return
            }

            setUploadingProof(true)
            try {
                const token = localStorage.getItem("token")
                const formData = new FormData()
                formData.append('deliveryProof', deliveryProofFile) // Direct upload

                await axios.post(
                    `${BACKEND_URL}/api/orders/${selectedOrder._id}/delivery-proof`,
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                )

                alert("Delivery proof uploaded successfully! Order marked as completed.")
                setShowDeliveryModal(false)
                setSelectedOrder(null)
                setDeliveryProofFile(null)
                fetchData()
            } catch (err) {
                console.error("Error uploading delivery proof:", err.response?.data || err.message)
                alert(err.response?.data?.message || "Failed to upload delivery proof.")
            } finally {
                setUploadingProof(false)
            }
        }

        const filteredOrders = useMemo(() => {
            let filtered = orders

            // Filter by search term
            const term = deferredSearchTerm.toLowerCase()
            if (term) {
                filtered = filtered.filter(
                    (order) =>
                        order.user?.name?.toLowerCase().includes(term) ||
                        order._id.toLowerCase().includes(term) ||
                        order.status.toLowerCase().includes(term),
                )
            }

            // Filter by status
            if (statusFilter !== "all") {
                filtered = filtered.filter((order) => order.status === statusFilter)
            }

            return filtered
        }, [orders, deferredSearchTerm, statusFilter])

        const indexOfLastItem = currentPage * itemsPerPage
        const indexOfFirstItem = indexOfLastItem - itemsPerPage
        const currentOrders = filteredOrders.slice(indexOfFirstItem, indexOfLastItem)
        const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Order Management</h2>
                        <p className="text-muted mb-0">Manage and track all customer orders</p>
                    </div>

                </div>

                {/* Filters and Search */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col lg={6}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <BsSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search by order ID, customer name, or status..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col lg={3}>
                                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="all">All Status</option>
                                    <option value="On Process">On Process</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Requesting for Refund">Requesting for Refund</option>
                                    <option value="Refunded">Refunded</option>

                                </Form.Select>
                            </Col>
                            <Col lg={3}>
                                <Button variant="outline-secondary" className="w-100">
                                    <BsFilter className="me-1" />
                                    More Filters
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Orders ({filteredOrders.length})</h5>
                            <div className="d-flex gap-2">
                                <Badge bg="warning">{orders.filter((o) => o.status === "On Process").length} On Process</Badge>
                                <Badge bg="primary">{orders.filter((o) => o.status === "Delivered").length} Delivered</Badge>
                                <Badge bg="success">{orders.filter((o) => o.status === "Requesting for Refund").length} Requesting for Refund</Badge>
                                <Badge bg="danger">{orders.filter((o) => o.status === "Refunded").length} Refunded</Badge>

                            </div>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold">Order ID</th>
                                        <th className="border-0 fw-semibold">Date</th>
                                        <th className="border-0 fw-semibold">Customer</th>
                                        <th className="border-0 fw-semibold">Items</th>
                                        <th className="border-0 fw-semibold">Total</th>
                                        <th className="border-0 fw-semibold">Status</th>
                                        <th className="border-0 fw-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentOrders.map((order) => (
                                        <tr key={order._id} className="border-bottom">
                                            <td className="py-3">
                                                <span className="font-monospace fw-medium">#{order._id.slice(-8)}</span>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                    <br />
                                                    <span className="text-muted">{new Date(order.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div>
                                                    <div className="fw-medium">{order.user?.name || "N/A"}</div>
                                                    <small className="text-muted">{order.user?.email}</small>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {order.items?.filter(item => item.item?.is_customizable).map((item, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="fw-medium">{item.item?.name}</span>
                                                            <Badge bg="info" className="ms-1">
                                                                <BsGear className="me-1" />
                                                                Custom
                                                            </Badge>
                                                            <span className="text-muted"> (×{item.quantity})</span>
                                                        </div>
                                                    ))}
                                                    {order.items?.filter(item => !item.item?.is_customizable).map((item, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="fw-medium">{item.item?.name}</span>
                                                            <span className="text-muted"> (×{item.quantity})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className="fw-bold fs-6">₱{order.amount.toLocaleString()}</span>
                                            </td>
                                            <td className="py-3">
                                                <Badge bg={getStatusVariant(order.status)} className="text-capitalize px-3 py-2">
                                                    {order.status}
                                                </Badge>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex gap-1">
                                                    <Form.Select
                                                        size="sm"
                                                        value={order.status}
                                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                        style={{ minWidth: "120px" }}
                                                    >
                                                        <option value="On Process">On Process</option>
                                                        <option value="Delivered">Delivered</option>
                                                        {order.status === "Delivered" && (
                                                            <option value="Refunded">Refunded</option>
                                                        )}

                                                    </Form.Select>
                                                    {(order.status === "Delivered" || order.status === "On Process") && !order.deliveryProof && (
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            onClick={() => handleUploadDeliveryProof(order)}
                                                            title="Upload Delivery Proof"
                                                        >
                                                            📸
                                                        </Button>
                                                    )}
                                                    {order.deliveryProof && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-info"
                                                            onClick={() => window.open(order.deliveryProof, '_blank')}
                                                            title="View Delivery Proof"
                                                        >
                                                            👁️
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                    {totalPages > 1 && (
                        <Card.Footer className="bg-white border-top-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">
                                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredOrders.length)} of{" "}
                                    {filteredOrders.length} orders
                                </small>
                                <Pagination size="sm" className="mb-0">
                                    <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} />
                                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                        const pageNum = currentPage <= 3 ? index + 1 : currentPage - 2 + index
                                        if (pageNum <= totalPages) {
                                            return (
                                                <Pagination.Item
                                                    key={pageNum}
                                                    active={pageNum === currentPage}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                >
                                                    {pageNum}
                                                </Pagination.Item>
                                            )
                                        }
                                        return null
                                    })}
                                    <Pagination.Next
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    />
                                </Pagination>
                            </div>
                        </Card.Footer>
                    )}
                </Card>

                {/* Delivery Proof Upload Modal */}
                <Modal show={showDeliveryModal} onHide={() => setShowDeliveryModal(false)} size="md" centered>
                    <Modal.Header closeButton className="border-0">
                        <Modal.Title className="fw-bold">
                            📸 Upload Delivery Proof
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="px-4">
                        <div className="mb-3">
                            <h6 className="fw-bold">Order Details:</h6>
                            <p className="text-muted mb-1">
                                Order ID: <span className="font-monospace">#{selectedOrder?._id.slice(-8)}</span>
                            </p>
                            <p className="text-muted mb-1">
                                Customer: {selectedOrder?.user?.name}
                            </p>
                            <p className="text-muted">
                                Amount: ₱{selectedOrder?.amount.toLocaleString()}
                            </p>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                                Select Delivery Proof Image *
                            </Form.Label>
                            <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={(e) => setDeliveryProofFile(e.target.files[0])}
                            />
                            <Form.Text className="text-muted">
                                Upload a photo showing the delivered package or customer receiving it.
                            </Form.Text>
                        </Form.Group>

                        {deliveryProofFile && (
                            <Alert variant="info" className="small">
                                <BsCheckCircle className="me-2" />
                                Selected: {deliveryProofFile.name} ({(deliveryProofFile.size / 1024 / 1024).toFixed(2)} MB)
                            </Alert>
                        )}
                    </Modal.Body>
                    <Modal.Footer className="border-0">
                        <Button
                            variant="outline-secondary"
                            onClick={() => {
                                setShowDeliveryModal(false)
                                setDeliveryProofFile(null)
                            }}
                            disabled={uploadingProof}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="success"
                            onClick={handleDeliveryProofSubmit}
                            disabled={!deliveryProofFile || uploadingProof}
                        >
                            {uploadingProof ? (
                                <>
                                    <Spinner as="span" animation="border" size="sm" className="me-2" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <BsUpload className="me-2" />
                                    Upload & Complete Order
                                </>
                            )}
                        </Button>
                    </Modal.Footer>
                </Modal>
            </div>
        )
    }

    // Item Management View
    const ItemManagementView = () => {
        // Local deferred search state
        const [searchTerm, setSearchTerm] = useState("")
        const deferredSearchTerm = useDeferredValue(searchTerm)
        const [categoryFilter, setCategoryFilter] = useState("all")

        const handleItemChange = (e) => {
            if (e.target.type === "file") {
                setItemForm((prev) => ({ ...prev, [e.target.name]: e.target.files }))
            } else if (e.target.type === "checkbox") {
                setItemForm((prev) => ({ ...prev, [e.target.name]: e.target.checked }))
            } else {
                setItemForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
            }
        }

        const handleCategoryChange = (catId) => {
            setItemForm((prev) => {
                const exists = prev.category.includes(catId)
                return {
                    ...prev,
                    category: exists ? prev.category.filter((c) => c !== catId) : [...prev.category, catId],
                }
            })
        }

        const CategoryMultiSelect = ({ selected, onChange }) => (
            <Dropdown className="w-100">
                <Dropdown.Toggle variant="outline-secondary" className="w-100 text-start" size="sm">
                    {selected.length > 0 ? `${selected.length} categories selected` : "Select Categories"}
                </Dropdown.Toggle>
                <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto", width: "100%" }}>
                    {categories.map((cat) => (
                        <Dropdown.Item key={cat._id} as="div" className="p-0">
                            <Form.Check
                                type="checkbox"
                                id={`cat-${cat._id}`}
                                label={cat.name}
                                checked={selected.includes(cat._id)}
                                onChange={() => onChange(cat._id)}
                                className="ps-3 py-2"
                            />
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            </Dropdown>
        )

        const handleEditItem = (item) => {
            setEditingItem(item)
            setShowEditModal(true)
        }

        const handleCloseModal = () => {
            setShowEditModal(false)
            setEditingItem(null)
        }

        const handleSaveItem = async (updatedItemData) => {
            if (!editingItem) return
            try {
                const token = localStorage.getItem("token")
                let payload = {
                    ...updatedItemData,
                    cost: Number(updatedItemData.cost),
                    stock: Number(updatedItemData.stock),
                    length: Number(updatedItemData.length),
                    height: Number(updatedItemData.height),
                    width: Number(updatedItemData.width),
                }

                // Build customization options if item is customizable
                if (updatedItemData.is_customizable) {
                    payload.is_customizable = true
                    payload.customization_options = {
                        labor_cost_per_day: Number(updatedItemData.labor_cost_per_day),
                        profit_margin: Number(updatedItemData.profit_margin),
                        overhead_cost: Number(updatedItemData.overhead_cost),
                        estimated_days: Number(updatedItemData.estimated_days),
                        materials: updatedItemData.materials || [],
                    }
                } else {
                    payload.is_customizable = false
                }

                let headers = { Authorization: `Bearer ${token}` }

                // If new images were selected, switch to multipart/form-data
                if (updatedItemData.images && updatedItemData.images.length) {
                    const fd = new FormData()
                    Object.entries(updatedItemData).forEach(([key, value]) => {
                        if (key === "category") {
                            value.forEach((v) => fd.append("category", v))
                        } else if (key === "images") {
                            for (let i = 0; i < Math.min(value.length, 2); i++) {
                                fd.append("images", value[i])
                            }
                        } else if (key === "customization_options") {
                            fd.append("customization_options", JSON.stringify(value))
                        } else {
                            fd.append(key, value)
                        }
                    })
                    payload = fd
                    // Don't set Content-Type manually - let axios set it automatically for FormData
                    delete headers["Content-Type"]
                }

                console.log("Updating item with payload:", payload)
                await axios.put(`${BACKEND_URL}/api/items/${editingItem._id}`, payload, {
                    headers,
                })
                fetchData()
                handleCloseModal()
            } catch (err) {
                console.error("Error updating item:", err.response?.data || err.message)
                alert(err.response?.data?.message || "Unable to update item")
            }
        }

        const handleDeleteItem = async (id) => {
            if (!window.confirm("Delete this item? This action cannot be undone.")) return
            try {
                await axios.delete(`${BACKEND_URL}/api/items/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                fetchData()
            } catch (err) {
                console.error("Error deleting item:", err)
                alert("Unable to delete item")
            }
        }

        const handleAddItem = async () => {
            try {
                // Enhanced validation for all required fields
                if (!itemForm.name || !itemForm.name.trim()) {
                    alert("Product name is required")
                    return
                }
                if (!itemForm.price || itemForm.price <= 0) {
                    alert("Valid price is required")
                    return
                }
                if (!itemForm.cost || itemForm.cost <= 0) {
                    alert("Valid cost is required")
                    return
                }
                if (!itemForm.category || itemForm.category.length === 0) {
                    alert("At least one category is required")
                    return
                }
                if (!itemForm.furnituretype) {
                    alert("Furniture type is required")
                    return
                }
                if (!itemForm.length || itemForm.length <= 0) {
                    alert("Valid length is required (must be greater than 0)")
                    return
                }
                if (!itemForm.height || itemForm.height <= 0) {
                    alert("Valid height is required (must be greater than 0)")
                    return
                }
                if (!itemForm.width || itemForm.width <= 0) {
                    alert("Valid width is required (must be greater than 0)")
                    return
                }
                if (!itemForm.images || itemForm.images.length === 0) {
                    alert("At least one image is required")
                    return
                }

                const fd = new FormData()
                Object.entries(itemForm).forEach(([key, value]) => {
                    if (key === "category") {
                        value.forEach((v) => fd.append("category", v))
                    } else if (key === "images" && value) {
                        for (let i = 0; i < Math.min(value.length, 2); i++) {
                            fd.append("images", value[i])
                        }
                    } else if (key === "customization_options") {
                        fd.append("customization_options", JSON.stringify(value))
                    } else {
                        fd.append(key, value)
                    }
                })

                await axios.post(`${BACKEND_URL}/api/items`, fd, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${localStorage.getItem("token")}`,
                    },
                })
                setAddItemMode(false)
                setItemForm(blankForm)
                fetchData()
            } catch (err) {
                console.error("Error adding item:", err)
                if (err.response?.data?.message) {
                    alert(`Error: ${err.response.data.message}`)
                } else {
                    alert("Unable to add item. Please check all required fields and try again.")
                }
            }
        }

        const filteredItems = useMemo(() => {
            let filtered = items

            // Filter by search term
            const term = deferredSearchTerm.toLowerCase()
            if (term) {
                filtered = filtered.filter(
                    (item) => item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term),
                )
            }

            // Filter by category
            if (categoryFilter !== "all") {
                filtered = filtered.filter((item) =>
                    Array.isArray(item.category)
                        ? item.category.some((cat) => cat._id === categoryFilter)
                        : item.category?._id === categoryFilter,
                )
            }

            return filtered
        }, [items, deferredSearchTerm, categoryFilter])

        const lowStock = filteredItems.some((i) => i.stock < 5)

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Product Management</h2>
                        <p className="text-muted mb-0">Manage your product inventory and details</p>
                    </div>
                    <div className="d-flex gap-2">

                        <Button variant="success" onClick={() => setAddItemMode(true)} disabled={addItemMode}>
                            <BsPlus className="me-1" />
                            Add Product
                        </Button>
                    </div>
                </div>

                {lowStock && (
                    <Alert variant="warning" className="mb-4 border-0 shadow-sm">
                        <div className="d-flex align-items-center">
                            <BsExclamationTriangle className="me-2 fs-5" />
                            <div>
                                <strong>Low Stock Alert!</strong> Some items are running low on stock. Check the highlighted rows below.
                            </div>
                        </div>
                    </Alert>
                )}

                {/* Filters and Search */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col lg={6}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <BsSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search products by name or description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col lg={3}>
                                <Form.Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                                    <option value="all">All Categories</option>
                                    {categories.map((cat) => (
                                        <option key={cat._id} value={cat._id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Col>
                            <Col lg={3}>
                                <Button variant="outline-secondary" className="w-100">
                                    <BsFilter className="me-1" />
                                    More Filters
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Products ({filteredItems.length})</h5>
                            <div className="d-flex gap-2">
                                <Badge bg="success">{items.filter((i) => i.stock >= 5).length} In Stock</Badge>
                                <Badge bg="warning">{items.filter((i) => i.stock < 5 && i.stock > 0).length} Low Stock</Badge>
                                <Badge bg="danger">{items.filter((i) => i.stock === 0).length} Out of Stock</Badge>
                            </div>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold" style={{ width: "80px" }}>
                                            Image
                                        </th>
                                        <th className="border-0 fw-semibold">Product Details</th>
                                        <th className="border-0 fw-semibold">Category</th>
                                        <th className="border-0 fw-semibold">Type</th>
                                        <th className="border-0 fw-semibold">Dimensions (cm)</th>
                                        <th className="border-0 fw-semibold">Cost</th>
                                        <th className="border-0 fw-semibold">Price</th>
                                        <th className="border-0 fw-semibold">Stock</th>
                                        <th className="border-0 fw-semibold" style={{ width: "150px" }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {addItemMode && (
                                        <tr className="table-light border-bottom">
                                            <td className="py-3">
                                                <Form.Control
                                                    type="file"
                                                    name="images"
                                                    accept="image/*"
                                                    multiple
                                                    size="sm"
                                                    onChange={handleItemChange}
                                                />
                                            </td>
                                            <td className="py-3">
                                                <Form.Control
                                                    name="name"
                                                    value={itemForm.name}
                                                    onChange={handleItemChange}
                                                    size="sm"
                                                    placeholder="Product name"
                                                    className="mb-2"
                                                />
                                                <Form.Control
                                                    as="textarea"
                                                    name="description"
                                                    value={itemForm.description}
                                                    onChange={handleItemChange}
                                                    size="sm"
                                                    rows="2"
                                                    placeholder="Description"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <CategoryMultiSelect selected={itemForm.category} onChange={handleCategoryChange} />
                                            </td>
                                            <td className="py-3">
                                                <Form.Select
                                                    name="furnituretype"
                                                    value={itemForm.furnituretype}
                                                    onChange={handleItemChange}
                                                    size="sm"
                                                >
                                                    <option value="">Select Type</option>
                                                    {furnitureTypes.map((ft) => (
                                                        <option key={ft._id} value={ft._id}>
                                                            {ft.name}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td className="py-3">
                                                <Form.Control
                                                    name="length"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.length}
                                                    onChange={handleItemChange}
                                                    placeholder="Length"
                                                />
                                                <Form.Control
                                                    name="height"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.height}
                                                    onChange={handleItemChange}
                                                    placeholder="Height"
                                                />
                                                <Form.Control
                                                    name="width"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.width}
                                                    onChange={handleItemChange}
                                                    placeholder="Width"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <Form.Control
                                                    name="cost"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.cost}
                                                    onChange={handleItemChange}
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <Form.Control
                                                    name="price"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.price}
                                                    onChange={handleItemChange}
                                                    placeholder="0.00"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <Form.Control
                                                    name="stock"
                                                    type="number"
                                                    size="sm"
                                                    value={itemForm.stock}
                                                    onChange={handleItemChange}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex gap-1">
                                                    <Button size="sm" variant="success" onClick={handleAddItem}>
                                                        <BsCheck />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        onClick={() => {
                                                            setAddItemMode(false)
                                                            setItemForm(blankForm)
                                                        }}
                                                    >
                                                        <BsX />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {filteredItems.map((item) => (
                                        <tr key={item._id} className={`border-bottom ${item.stock < 5 ? "table-warning" : ""}`}>
                                            <td className="py-3">
                                                {item.imageUrl ? (
                                                    <img
                                                        src={Array.isArray(item.imageUrl) ? item.imageUrl[0] : item.imageUrl}
                                                        alt={item.name}
                                                        className="rounded"
                                                        style={{ width: "60px", height: "60px", objectFit: "cover" }}
                                                    />
                                                ) : (
                                                    <div
                                                        className="bg-light d-flex align-items-center justify-content-center rounded"
                                                        style={{ width: "60px", height: "60px" }}
                                                    >
                                                        <BsBoxSeam className="text-muted" size={24} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <div>
                                                    <div className="fw-medium mb-1">{item.name}</div>
                                                    <p className="text-muted small mb-2" style={{ maxWidth: "200px" }}>
                                                        {item.description?.substring(0, 80)}...
                                                    </p>
                                                    <div className="d-flex gap-1">
                                                        {item.is_bestseller && (
                                                            <Badge bg="warning" className="small">
                                                                Bestseller
                                                            </Badge>
                                                        )}
                                                        {item.isPackage && (
                                                            <Badge bg="info" className="small">
                                                                Package
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {Array.isArray(item.category) ? (
                                                        item.category.map((c, idx) => (
                                                            <Badge key={c._id} bg="secondary" className="me-1 mb-1">
                                                                {c.name}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Badge bg="secondary">{item.category?.name}</Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className="fw-medium">{item.furnituretype?.name}</span>
                                            </td>
                                            <td className="py-3">
                                                <span>{item.length} cm × {item.height} cm × {item.width} cm</span>
                                            </td>
                                            <td className="py-3">
                                                <span>₱{(item.cost || 0).toLocaleString()}</span>
                                            </td>
                                            <td className="py-3">
                                                <span className="fw-bold fs-6">₱{item.price.toLocaleString()}</span>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center">
                                                    <span
                                                        className={`fw-bold ${item.stock < 5 ? "text-danger" : item.stock < 10 ? "text-warning" : "text-success"}`}
                                                    >
                                                        {item.stock}
                                                    </span>
                                                    {item.stock < 5 && <BsExclamationTriangle className="ms-2 text-warning" />}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex gap-1">
                                                    <Button size="sm" variant="outline-primary" onClick={() => handleEditItem(item)}>
                                                        <BsPencil />
                                                    </Button>
                                                    <Button size="sm" variant="outline-danger" onClick={() => handleDeleteItem(item._id)}>
                                                        <BsTrash />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>

                {/* Edit Modal */}
                {editingItem && (
                    <ItemEditModal
                        show={showEditModal}
                        onHide={handleCloseModal}
                        onSave={handleSaveItem}
                        item={editingItem}
                        categories={categories}
                        furnitureTypes={furnitureTypes}
                    />
                )}
            </div>
        )
    }

    // User Management View
    const UserManagementView = () => {
        // Local deferred search state
        const [searchTerm, setSearchTerm] = useState("")
        const deferredSearchTerm = useDeferredValue(searchTerm)
        const [roleFilter, setRoleFilter] = useState("all")

        const handleEditUser = (user) => {
            setEditUserId(user._id)
            setUserForm({ name: user.name, email: user.email })
        }

        const handleUserChange = (e) => {
            setUserForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
        }

        const handleUpdateUser = async (id) => {
            try {
                await axios.put(`${BACKEND_URL}/api/updateusers/${id}`, userForm)
                setEditUserId(null)
                fetchData()
            } catch (err) {
                console.error("Error updating user:", err)
                alert("Unable to update user")
            }
        }

        const handleDeleteUser = async (id) => {
            if (!window.confirm("Delete this user and their cart? This action cannot be undone.")) return
            try {
                await axios.delete(`${BACKEND_URL}/api/deleteusers/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                fetchData()
            } catch (err) {
                console.error("Error deleting user:", err)
                alert("Unable to delete user")
            }
        }

        const handleRoleChange = async (userId, newRole) => {
            try {
                const user = users.find((u) => u._id === userId)
                await axios.put(`${BACKEND_URL}/api/updateusers/${userId}`, {
                    ...user,
                    role: newRole,
                })
                fetchData()
            } catch (err) {
                alert("Error updating role")
            }
        }

        const filteredUsers = useMemo(() => {
            let filtered = users

            // Filter by search term
            const term = deferredSearchTerm.toLowerCase()
            if (term) {
                filtered = filtered.filter(
                    (user) => user.name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term),
                )
            }

            // Filter by role
            if (roleFilter !== "all") {
                filtered = filtered.filter((user) => user.role === roleFilter)
            }

            return filtered
        }, [users, deferredSearchTerm, roleFilter])

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">User Management</h2>
                        <p className="text-muted mb-0">Manage user accounts and permissions</p>
                    </div>

                </div>

                {/* Filters and Search */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col lg={8}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <BsSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search users by name or email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col lg={4}>
                                <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                                    <option value="all">All Roles</option>
                                    <option value="user">Users</option>
                                    <option value="admin">Admins</option>
                                </Form.Select>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Users ({filteredUsers.length})</h5>
                            <div className="d-flex gap-2">
                                <Badge bg="primary">{users.filter((u) => u.role === "user").length} Users</Badge>
                                <Badge bg="danger">{users.filter((u) => u.role === "admin").length} Admins</Badge>
                            </div>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold">User ID</th>
                                        <th className="border-0 fw-semibold">User Details</th>
                                        <th className="border-0 fw-semibold">Role</th>
                                        <th className="border-0 fw-semibold">Cart ID</th>
                                        <th className="border-0 fw-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user._id} className="border-bottom">
                                            <td className="py-3">
                                                <span className="font-monospace fw-medium">#{user._id.slice(-8)}</span>
                                            </td>
                                            <td className="py-3">
                                                {editUserId === user._id ? (
                                                    <div>
                                                        <Form.Control
                                                            name="name"
                                                            value={userForm.name}
                                                            onChange={handleUserChange}
                                                            size="sm"
                                                            className="mb-2"
                                                            placeholder="Full name"
                                                        />
                                                        <Form.Control
                                                            name="email"
                                                            type="email"
                                                            value={userForm.email}
                                                            onChange={handleUserChange}
                                                            size="sm"
                                                            placeholder="Email address"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div className="fw-medium mb-1">{user.name}</div>
                                                        <small className="text-muted">{user.email}</small>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3">
                                                <Form.Select
                                                    size="sm"
                                                    value={user.role}
                                                    disabled={editUserId === user._id}
                                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                                    style={{ minWidth: "100px" }}
                                                >
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </Form.Select>
                                            </td>
                                            <td className="py-3">
                                                <span className="font-monospace text-muted small">
                                                    {user.cart ? `#${user.cart.slice(-6)}` : "N/A"}
                                                </span>
                                            </td>
                                            <td className="py-3">
                                                {editUserId === user._id ? (
                                                    <div className="d-flex gap-1">
                                                        <Button size="sm" variant="success" onClick={() => handleUpdateUser(user._id)}>
                                                            <BsCheck />
                                                        </Button>
                                                        <Button size="sm" variant="secondary" onClick={() => setEditUserId(null)}>
                                                            <BsX />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="d-flex gap-1">
                                                        <Button size="sm" variant="outline-primary" onClick={() => handleEditUser(user)}>
                                                            <BsPencil />
                                                        </Button>
                                                        <Button size="sm" variant="outline-danger" onClick={() => handleDeleteUser(user._id)}>
                                                            <BsTrash />
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        )
    }

    // Store Settings View
    const StoreSettingsView = () => {
        // Category CRUD
        const addCategory = async () => {
            if (!newCategoryName.trim()) return
            try {
                await axios.post(
                    `${BACKEND_URL}/api/categories`,
                    { name: newCategoryName },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
                )
                setNewCategoryName("")
                fetchData()
            } catch (err) {
                alert(err.response?.data?.message || "Error adding category")
            }
        }

        const updateCategory = async () => {
            try {
                await axios.put(
                    `${BACKEND_URL}/api/categories/${editingCategory._id}`,
                    { name: editingCategory.name },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
                )
                setEditingCategory(null)
                fetchData()
            } catch (err) {
                alert("Error updating category")
            }
        }

        const deleteCategory = async (id) => {
            if (!window.confirm("Delete this category? This may affect existing products.")) return
            try {
                await axios.delete(`${BACKEND_URL}/api/categories/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                fetchData()
            } catch (err) {
                alert(err.response?.data?.message || "Error deleting category")
            }
        }

        // Furniture Type CRUD
        const addFurnitureType = async () => {
            if (!newFurnitureTypeName.trim()) return
            try {
                await axios.post(
                    `${BACKEND_URL}/api/furnituretypes`,
                    { name: newFurnitureTypeName },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
                )
                setNewFurnitureTypeName("")
                fetchData()
            } catch (err) {
                alert(err.response?.data?.message || "Error adding furniture type")
            }
        }

        const updateFurnitureType = async () => {
            try {
                await axios.put(
                    `${BACKEND_URL}/api/furnituretypes/${editingFurnitureType._id}`,
                    { name: editingFurnitureType.name },
                    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
                )
                setEditingFurnitureType(null)
                fetchData()
            } catch (err) {
                alert("Error updating furniture type")
            }
        }

        const deleteFurnitureType = async (id) => {
            if (!window.confirm("Delete this furniture type? This may affect existing products.")) return
            try {
                await axios.delete(`${BACKEND_URL}/api/furnituretypes/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
                })
                fetchData()
            } catch (err) {
                alert(err.response?.data?.message || "Error deleting furniture type")
            }
        }

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Store Settings</h2>
                        <p className="text-muted mb-0">Manage categories and furniture types for your products</p>
                    </div>
                </div>

                <Row className="g-4">
                    <Col lg={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className="bg-white border-bottom-0 py-3">
                                <h5 className="mb-0 fw-bold">
                                    <BsTagFill className="me-2 text-primary" />
                                    Product Categories
                                </h5>
                            </Card.Header>
                            <Card.Body>
                                <InputGroup className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter new category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && addCategory()}
                                    />
                                    <Button variant="success" disabled={!newCategoryName.trim()} onClick={addCategory}>
                                        <BsPlus />
                                    </Button>
                                </InputGroup>

                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="border-0 fw-semibold">Category Name</th>
                                                <th className="border-0 fw-semibold" style={{ width: "120px" }}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories.map((cat) => (
                                                <tr key={cat._id} className="border-bottom">
                                                    <td className="py-3">
                                                        {editingCategory?._id === cat._id ? (
                                                            <Form.Control
                                                                size="sm"
                                                                value={editingCategory.name}
                                                                onChange={(e) =>
                                                                    setEditingCategory({
                                                                        ...editingCategory,
                                                                        name: e.target.value,
                                                                    })
                                                                }
                                                                onKeyPress={(e) => e.key === "Enter" && updateCategory()}
                                                            />
                                                        ) : (
                                                            <span className="fw-medium">{cat.name}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {editingCategory?._id === cat._id ? (
                                                            <div className="d-flex gap-1">
                                                                <Button size="sm" variant="success" onClick={updateCategory}>
                                                                    <BsCheck />
                                                                </Button>
                                                                <Button size="sm" variant="secondary" onClick={() => setEditingCategory(null)}>
                                                                    <BsX />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex gap-1">
                                                                <Button size="sm" variant="outline-primary" onClick={() => setEditingCategory(cat)}>
                                                                    <BsPencil />
                                                                </Button>
                                                                <Button size="sm" variant="outline-danger" onClick={() => deleteCategory(cat._id)}>
                                                                    <BsTrash />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>

                    <Col lg={6}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Header className="bg-white border-bottom-0 py-3">
                                <h5 className="mb-0 fw-bold">
                                    <BsShop className="me-2 text-success" />
                                    Furniture Types
                                </h5>
                            </Card.Header>
                            <Card.Body>
                                <InputGroup className="mb-3">
                                    <Form.Control
                                        type="text"
                                        placeholder="Enter new furniture type"
                                        value={newFurnitureTypeName}
                                        onChange={(e) => setNewFurnitureTypeName(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && addFurnitureType()}
                                    />
                                    <Button variant="success" disabled={!newFurnitureTypeName.trim()} onClick={addFurnitureType}>
                                        <BsPlus />
                                    </Button>
                                </InputGroup>

                                <div className="table-responsive">
                                    <Table hover className="mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="border-0 fw-semibold">Furniture Type</th>
                                                <th className="border-0 fw-semibold" style={{ width: "120px" }}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {furnitureTypes.map((ft) => (
                                                <tr key={ft._id} className="border-bottom">
                                                    <td className="py-3">
                                                        {editingFurnitureType?._id === ft._id ? (
                                                            <Form.Control
                                                                size="sm"
                                                                value={editingFurnitureType.name}
                                                                onChange={(e) =>
                                                                    setEditingFurnitureType({
                                                                        ...editingFurnitureType,
                                                                        name: e.target.value,
                                                                    })
                                                                }
                                                                onKeyPress={(e) => e.key === "Enter" && updateFurnitureType()}
                                                            />
                                                        ) : (
                                                            <span className="fw-medium">{ft.name}</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {editingFurnitureType?._id === ft._id ? (
                                                            <div className="d-flex gap-1">
                                                                <Button size="sm" variant="success" onClick={updateFurnitureType}>
                                                                    <BsCheck />
                                                                </Button>
                                                                <Button size="sm" variant="secondary" onClick={() => setEditingFurnitureType(null)}>
                                                                    <BsX />
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="d-flex gap-1">
                                                                <Button size="sm" variant="outline-primary" onClick={() => setEditingFurnitureType(ft)}>
                                                                    <BsPencil />
                                                                </Button>
                                                                <Button size="sm" variant="outline-danger" onClick={() => deleteFurnitureType(ft._id)}>
                                                                    <BsTrash />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }

    // Modal component for editing items
    const ItemEditModal = ({ show, onHide, onSave, item, categories, furnitureTypes }) => {
        const [itemForm, setItemForm] = useState({ ...blankForm })

        useEffect(() => {
            if (item) {
                setItemForm({
                    name: item.name || "",
                    description: item.description || "",
                    cost: item.cost || 0,
                    stock: item.stock || 0,
                    category: Array.isArray(item.category) ? item.category.map((c) => c._id) : [],
                    furnituretype: item.furnituretype?._id || "",
                    length: item.length || "",
                    height: item.height || "",
                    width: item.width || "",
                    is_bestseller: item.is_bestseller || false,
                    isPackage: item.isPackage || false,
                    images: null,
                    is_customizable: item.is_customizable || false,
                    labor_cost_per_day: item.customization_options?.labor_cost_per_day || 350,
                    profit_margin: item.customization_options?.profit_margin || 0.5,
                    overhead_cost: item.customization_options?.overhead_cost || 500,
                    estimated_days: item.customization_options?.estimated_days || 7,
                    materials: item.customization_options?.materials || [],
                })
            }
        }, [item])

        const handleFormChange = (e) => {
            const { name, value, type, checked } = e.target
            if (name.startsWith("material_")) {
                const parts = name.split("_")
                const index = Number(parts[1])
                const field = parts.slice(2).join("_") // e.g., plank_2x12x10_cost or name
                setItemForm((prev) => {
                    const mats = [...prev.materials]
                    const updatedValue = field.includes("cost") ? Number(value) : value
                    mats[index] = { ...mats[index], [field]: updatedValue }
                    return { ...prev, materials: mats }
                })
            } else {
                setItemForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
            }
        }

        const handleCategoryChange = (catId) => {
            setItemForm((prev) => {
                const exists = prev.category.includes(catId)
                return { ...prev, category: exists ? prev.category.filter((c) => c !== catId) : [...prev.category, catId] }
            })
        }

        const handleSaveChanges = () => {
            onSave(itemForm)
        }

        return (
            <Modal show={show} onHide={onHide} size="lg" centered>
                <Modal.Header closeButton className="border-0">
                    <Modal.Title className="fw-bold">
                        Edit Product: <span className="text-primary">{item?.name}</span>
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="px-4">
                    <Form>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Product Name</Form.Label>
                                    <Form.Control type="text" name="name" value={itemForm.name} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Cost (₱)</Form.Label>
                                    <Form.Control type="number" name="cost" value={itemForm.cost} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Price (₱)</Form.Label>
                                    <Form.Control type="number" name="price" value={itemForm.price} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Stock Quantity</Form.Label>
                                    <Form.Control type="number" name="stock" value={itemForm.stock} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={itemForm.description}
                                onChange={handleFormChange}
                            />
                        </Form.Group>

                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label className="fw-semibold">Categories</Form.Label>
                                <Dropdown className="w-100">
                                    <Dropdown.Toggle variant="outline-secondary" className="w-100 text-start">
                                        {itemForm.category?.length || 0} categories selected
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu style={{ maxHeight: "200px", overflowY: "auto", width: "100%" }}>
                                        {categories.map((cat) => (
                                            <Dropdown.Item key={cat._id} as="div" className="p-0">
                                                <Form.Check
                                                    type="checkbox"
                                                    id={`edit-cat-${cat._id}`}
                                                    label={cat.name}
                                                    checked={itemForm.category?.includes(cat._id)}
                                                    onChange={() => handleCategoryChange(cat._id)}
                                                    className="ps-3 py-2"
                                                />
                                            </Dropdown.Item>
                                        ))}
                                    </Dropdown.Menu>
                                </Dropdown>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Furniture Type</Form.Label>
                                    <Form.Select name="furnituretype" value={itemForm.furnituretype} onChange={handleFormChange}>
                                        <option value="">Select a Type</option>
                                        {furnitureTypes.map((ft) => (
                                            <option key={ft._id} value={ft._id}>
                                                {ft.name}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Row className="mb-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Length (cm)</Form.Label>
                                    <Form.Control type="number" name="length" value={itemForm.length} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Width (cm)</Form.Label>
                                    <Form.Control type="number" name="width" value={itemForm.width} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group>
                                    <Form.Label className="fw-semibold">Height (cm)</Form.Label>
                                    <Form.Control type="number" name="height" value={itemForm.height} onChange={handleFormChange} />
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">Replace Images (optional)</Form.Label>
                            <Form.Control
                                type="file"
                                name="images"
                                multiple
                                accept="image/*"
                                onChange={(e) => setItemForm((prev) => ({ ...prev, images: e.target.files }))}
                            />
                            <Form.Text className="text-muted">
                                Select new images to replace existing ones. Leave empty to keep current images.
                            </Form.Text>
                        </Form.Group>

                        <Row>
                            <Col>
                                <Form.Check
                                    type="switch"
                                    id="is_bestseller-switch"
                                    name="is_bestseller"
                                    label="Mark as Bestseller"
                                    checked={itemForm.is_bestseller}
                                    onChange={handleFormChange}
                                />
                            </Col>
                            <Col>
                                <Form.Check
                                    type="switch"
                                    id="isPackage-switch"
                                    name="isPackage"
                                    label="Package Deal"
                                    checked={itemForm.isPackage}
                                    onChange={handleFormChange}
                                />
                            </Col>
                        </Row>

                        {/* Customization Switch */}
                        <Row className="mt-3">
                            <Col>
                                <Form.Check
                                    type="switch"
                                    id="is_customizable-switch"
                                    name="is_customizable"
                                    label="Enable Customization (Tables Only)"
                                    checked={itemForm.is_customizable}
                                    disabled={!furnitureTypes.find((ft) => ft._id === itemForm.furnituretype)?.name?.toLowerCase().includes("table")}
                                    onChange={handleFormChange}
                                />
                            </Col>
                        </Row>

                        {itemForm.is_customizable && (
                            <>
                                <Row className="mb-3 mt-2">
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Labor Cost / Day (₱)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="labor_cost_per_day"
                                                value={itemForm.labor_cost_per_day}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Profit Margin</Form.Label>
                                            <Form.Control
                                                type="number"
                                                step="0.01"
                                                name="profit_margin"
                                                value={itemForm.profit_margin}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Overhead Cost (₱)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="overhead_cost"
                                                value={itemForm.overhead_cost}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Estimated Days</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="estimated_days"
                                                value={itemForm.estimated_days}
                                                onChange={handleFormChange}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-semibold">Materials</Form.Label>
                                </Form.Group>
                                {itemForm.materials.map((mat, idx) => (
                                    <Row key={idx} className="g-2 align-items-end mb-2">
                                        <Col md={3}>
                                            <Form.Control
                                                placeholder="Name"
                                                name={`material_${idx}_name`}
                                                value={mat.name}
                                                onChange={handleFormChange}
                                            />
                                        </Col>
                                        <Col md={3}>
                                            <InputGroup>
                                                <InputGroup.Text>2×12×10</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    placeholder="Cost"
                                                    name={`material_${idx}_plank_2x12x10_cost`}
                                                    value={mat.plank_2x12x10_cost}
                                                    onChange={handleFormChange}
                                                />
                                            </InputGroup>
                                        </Col>
                                        <Col md={3}>
                                            <InputGroup>
                                                <InputGroup.Text>3×3×10</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    placeholder="Cost"
                                                    name={`material_${idx}_plank_3x3x10_cost`}
                                                    value={mat.plank_3x3x10_cost}
                                                    onChange={handleFormChange}
                                                />
                                            </InputGroup>
                                        </Col>
                                        <Col md={3}>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() =>
                                                    setItemForm((prev) => ({
                                                        ...prev,
                                                        materials: prev.materials.filter((_, i) => i !== idx),
                                                    }))
                                                }
                                            >
                                                Remove
                                            </Button>
                                        </Col>
                                    </Row>
                                ))}
                                <Button
                                    variant="outline-primary"
                                    size="sm"
                                    className="mb-3"
                                    onClick={() =>
                                        setItemForm((prev) => ({
                                            ...prev,
                                            materials: [
                                                ...prev.materials,
                                                { name: "", plank_2x12x10_cost: 0, plank_3x3x10_cost: 0 },
                                            ],
                                        }))
                                    }
                                >
                                    Add Material
                                </Button>
                            </>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer className="border-0">
                    <Button variant="outline-secondary" onClick={onHide}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveChanges}>
                        <BsCheck className="me-1" />
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>
        )
    }

    // Mobile Sidebar Component
    const MobileSidebar = () => (
        <Offcanvas show={showSidebar} onHide={() => setShowSidebar(false)} placement="start">
            <Offcanvas.Header closeButton className="bg-dark text-white">
                <Offcanvas.Title>
                    <BsShop className="me-2" />
                    WAWA ADMIN
                </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="bg-dark text-white p-0">
                <Nav
                    className="flex-column p-3"
                    activeKey={activeTab}
                    onSelect={(k) => {
                        setActiveTab(k)
                        setShowSidebar(false)
                    }}
                >
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="dashboard" className="text-white rounded d-flex align-items-center py-3">
                            <BsBarChartFill className="me-3" />
                            Dashboard
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="items" className="text-white rounded d-flex align-items-center py-3">
                            <BsBoxSeam className="me-3" />
                            Products
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="orders" className="text-white rounded d-flex align-items-center py-3">
                            <BsCartFill className="me-3" />
                            Orders
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="customizedOrders" className="text-white rounded d-flex align-items-center py-3">
                            <BsGear className="me-3" />
                            Customized Orders
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="users" className="text-white rounded d-flex align-items-center py-3">
                            <BsPersonFill className="me-3" />
                            Users
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link eventKey="chat" className="text-white rounded d-flex align-items-center py-3">
                            <BsChatDots className="me-3" />
                            Chat
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item className="mb-2">
                        <Nav.Link
                            eventKey="categoriesandfurnituretypes"
                            className="text-white rounded d-flex align-items-center py-3"
                        >
                            <BsTagFill className="me-3" />
                            Settings
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
                <div className="mt-auto p-3 border-top border-secondary">
                    <Button variant="outline-light" size="sm" className="w-100" onClick={handleLogout}>
                        <BsPower className="me-2" />
                        Logout
                    </Button>
                </div>
            </Offcanvas.Body>
        </Offcanvas>
    )

    // Analytics View
    const AnalyticsView = () => {
        // Aggregate sales per item (paid/completed orders)
        const salesPerItem = useMemo(() => {
            const map = {}
            orders
                .filter((o) => o.status === "On Process" || o.status === "Delivered")
                .forEach((order) => {
                    order.items.forEach((it) => {
                        if (!it.item) return
                        const id = it.item._id
                        if (!map[id]) {
                            map[id] = {
                                name: it.item.name,
                                quantity: 0,
                                revenue: 0,
                                cost: 0,
                            }
                        }
                        const qty = it.quantity || 0
                        const price = it.item.price || 0
                        const costUnit = it.item.cost || 0
                        map[id].quantity += qty
                        map[id].revenue += price * qty
                        map[id].cost += costUnit * qty
                    })
                })
            return Object.values(map)
                .map((rec) => ({ ...rec, profit: rec.revenue - rec.cost }))
                .sort((a, b) => b.revenue - a.revenue)
        }, [orders])

        // Aggregate monthly revenue and profit (last 12 months)
        const monthlyStats = useMemo(() => {
            const map = {}
            orders
                .filter((o) => o.status === "On Process" || o.status === "Delivered")
                .forEach((order) => {
                    const d = new Date(order.createdAt)
                    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` // YYYY-MM
                    if (!map[key]) map[key] = { revenue: 0, cost: 0 }
                    map[key].revenue += order.amount
                    // accumulate cost of goods
                    order.items.forEach((it) => {
                        if (!it.item) return
                        map[key].cost += (it.item.cost || 0) * (it.quantity || 0)
                    })
                })
            return Object.entries(map)
                .map(([month, v]) => ({ month, revenue: v.revenue, profit: v.revenue - v.cost }))
                .sort((a, b) => (a.month > b.month ? 1 : -1))
                .slice(-12)
        }, [orders])

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Analytics & Reports</h2>
                        <p className="text-muted mb-0">Sales performance and financial metrics</p>
                    </div>
                </div>

                {/* Sales per Item */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <h5 className="mb-0 fw-bold">Top Selling Items</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold">Item</th>
                                        <th className="border-0 fw-semibold">Quantity Sold</th>
                                        <th className="border-0 fw-semibold">Revenue (₱)</th>
                                        <th className="border-0 fw-semibold">Profit (₱)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {salesPerItem.map((s) => (
                                        <tr key={s.name} className="border-bottom">
                                            <td className="py-3 fw-medium">{s.name}</td>
                                            <td className="py-3">{s.quantity}</td>
                                            <td className="py-3">₱{s.revenue.toLocaleString()}</td>
                                            <td className="py-3">₱{s.profit.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {salesPerItem.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center py-4 text-muted">
                                                No sales data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>

                {/* Monthly revenue/profit */}
                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <h5 className="mb-0 fw-bold">Monthly Revenue & Profit (Last 12 Months)</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold">Month</th>
                                        <th className="border-0 fw-semibold">Revenue (₱)</th>
                                        <th className="border-0 fw-semibold">Net Profit (₱)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyStats.map((m) => (
                                        <tr key={m.month} className="border-bottom">
                                            <td className="py-3">{m.month}</td>
                                            <td className="py-3">₱{m.revenue.toLocaleString()}</td>
                                            <td className="py-3">₱{m.profit.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {monthlyStats.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center py-4 text-muted">
                                                No financial data available.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        )
    }

    // Customized Orders Management View
    const CustomizedOrdersView = () => {
        console.log("=== CUSTOMIZED ORDERS VIEW INITIALIZED ===")
        console.log("Total orders loaded:", orders.length)

        // Filter orders that contain customized items
        const customizedOrders = useMemo(() => {
            console.log("[CUSTOM VIEW] Filtering for customized orders from total orders:", orders.length);

            const filtered = orders.filter(order => {
                console.log(`[CUSTOM VIEW] Checking Order ID: ${order._id}`);
                const hasCustomItems = order.items?.some(item => {
                    console.log(`[CUSTOM VIEW]   -> Inspecting item:`, item);
                    // More robust check for custom dimensions. Checks for existence and not null.
                    const isCustom = item.customH != null && item.customW != null && item.customL != null;
                    if (isCustom) {
                        console.log(`[CUSTOM VIEW]   -> SUCCESS: Found custom dimensions! H:${item.customH}, W:${item.customW}, L:${item.customL}`);
                    }
                    return isCustom;
                });

                if (hasCustomItems) {
                    console.log(`[CUSTOM VIEW] -> SUCCESS: Order ${order._id} is a custom order.`);
                    return true;
                }
                return false;
            });

            console.log(`[CUSTOM VIEW] Total customized orders found:`, filtered.length);
            return filtered;
        }, [orders]);

        // Local state for filters
        const [searchTerm, setSearchTerm] = useState("")
        const [statusFilter, setStatusFilter] = useState("all")
        const [materialFilter, setMaterialFilter] = useState("all")
        const [dateFilter, setDateFilter] = useState("all")
        const [priceFilter, setPriceFilter] = useState("all")
        const [sortBy, setSortBy] = useState("newest")

        // Get unique materials from customized items
        const availableMaterials = useMemo(() => {
            const materials = new Set()
            customizedOrders.forEach(order => {
                order.items?.forEach(item => {
                    if (item.item?.is_customizable && item.item?.materials) {
                        item.item.materials.forEach(material => {
                            if (material.name) materials.add(material.name)
                        })
                    }
                })
            })
            console.log("Available materials:", Array.from(materials))
            return Array.from(materials)
        }, [customizedOrders])

        // Calculate custom price for each order
        const ordersWithCustomPrice = useMemo(() => {
            return customizedOrders.map(order => {
                let customPrice = 0
                order.items?.forEach(item => {
                    if (item.item?.is_customizable) {
                        // Calculate custom price based on dimensions and materials
                        const basePrice = item.price || 0
                        const quantity = item.quantity || 1
                        customPrice += basePrice * quantity
                    }
                })

                return {
                    ...order,
                    customPrice: customPrice
                }
            })
        }, [customizedOrders])

        // Apply filters and sorting
        const filteredOrders = useMemo(() => {
            console.log("=== APPLYING FILTERS AND SORTING ===")
            console.log("Search term:", searchTerm)
            console.log("Status filter:", statusFilter)
            console.log("Material filter:", materialFilter)
            console.log("Date filter:", dateFilter)
            console.log("Price filter:", priceFilter)
            console.log("Sort by:", sortBy)

            let filtered = ordersWithCustomPrice

            // Filter by search term (customer name or order ID)
            if (searchTerm) {
                const term = searchTerm.toLowerCase()
                filtered = filtered.filter(order =>
                    order.user?.name?.toLowerCase().includes(term) ||
                    order._id.toLowerCase().includes(term)
                )
                console.log("After search filter:", filtered.length)
            }

            // Filter by status
            if (statusFilter !== "all") {
                filtered = filtered.filter(order => order.status === statusFilter)
                console.log("After status filter:", filtered.length)
            }

            // Filter by material
            if (materialFilter !== "all") {
                filtered = filtered.filter(order =>
                    order.items?.some(item =>
                        item.item?.is_customizable &&
                        item.item?.materials?.some(material => material.name === materialFilter)
                    )
                )
                console.log("After material filter:", filtered.length)
            }

            // Filter by date range
            if (dateFilter !== "all") {
                const now = new Date()
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

                filtered = filtered.filter(order => {
                    const orderDate = new Date(order.createdAt)
                    switch (dateFilter) {
                        case "today":
                            return orderDate >= today
                        case "week":
                            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                            return orderDate >= weekAgo
                        case "month":
                            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                            return orderDate >= monthAgo
                        default:
                            return true
                    }
                })
                console.log("After date filter:", filtered.length)
            }

            // Filter by price range
            if (priceFilter !== "all") {
                filtered = filtered.filter(order => {
                    const price = order.customPrice
                    switch (priceFilter) {
                        case "low":
                            return price < 5000
                        case "medium":
                            return price >= 5000 && price < 15000
                        case "high":
                            return price >= 15000
                        default:
                            return true
                    }
                })
                console.log("After price filter:", filtered.length)
            }

            // Sort orders
            filtered.sort((a, b) => {
                switch (sortBy) {
                    case "newest":
                        return new Date(b.createdAt) - new Date(a.createdAt)
                    case "oldest":
                        return new Date(a.createdAt) - new Date(b.createdAt)
                    case "price-high":
                        return b.customPrice - a.customPrice
                    case "price-low":
                        return a.customPrice - b.customPrice
                    case "status":
                        return a.status.localeCompare(b.status)
                    default:
                        return 0
                }
            })

            console.log("Final filtered orders:", filtered.length)
            return filtered
        }, [ordersWithCustomPrice, searchTerm, statusFilter, materialFilter, dateFilter, priceFilter, sortBy])

        // Check if order is overdue or nearing deadline
        const getOrderStatusColor = (order) => {
            const orderDate = new Date(order.createdAt)
            const now = new Date()
            const daysSinceOrder = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24))

            // Check if order has estimated days
            const estimatedDays = order.items?.find(item => item.item?.is_customizable)?.item?.estimated_days || 7

            if (daysSinceOrder > estimatedDays) {
                return "danger" // Red for overdue
            } else if (daysSinceOrder >= estimatedDays - 2) {
                return "warning" // Yellow for nearing deadline
            } else {
                return "success" // Green for on track
            }
        }

        // Check if order is new (within 24 hours)
        const isNewOrder = (order) => {
            const orderDate = new Date(order.createdAt)
            const now = new Date()
            const hoursSinceOrder = (now - orderDate) / (1000 * 60 * 60)
            return hoursSinceOrder < 24
        }

        const handleStatusChange = async (orderId, newStatus) => {
            console.log("=== STATUS CHANGE REQUEST ===")
            console.log("Order ID:", orderId)
            console.log("New status:", newStatus)
            console.log("User making change:", userRole)
            console.log("Timestamp:", new Date().toISOString())

            if (!window.confirm(`Change status to "${newStatus}"?`)) return

            try {
                const token = localStorage.getItem("token")
                await axios.put(
                    `${BACKEND_URL}/api/orders/${orderId}/status`,
                    { status: newStatus },
                    { headers: { Authorization: `Bearer ${token}` } },
                )
                console.log("Status change successful")
                fetchData()
            } catch (err) {
                console.error("Error updating order status:", err)
                alert("Failed to update status.")
            }
        }

        return (
            <div>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1">Customized Orders Management</h2>
                        <p className="text-muted mb-0">Manage and track customized furniture orders</p>
                    </div>
                    <div className="d-flex gap-2">
                        <Badge bg="primary" className="fs-6">
                            {customizedOrders.length} Custom Orders
                        </Badge>
                        <Badge bg="secondary" className="fs-6">
                            {orders.length - customizedOrders.length} Regular Orders
                        </Badge>

                    </div>
                </div>

                {/* Filters and Search */}
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <Row className="g-3">
                            <Col lg={4}>
                                <InputGroup>
                                    <InputGroup.Text>
                                        <BsSearch />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search by customer or order ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </InputGroup>
                            </Col>
                            <Col lg={2}>
                                <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="all">All Status</option>
                                    <option value="On Process">On Process</option>
                                    <option value="Delivered">Delivered</option>
                                    <option value="Requesting for Refund">Requesting for Refund</option>
                                    <option value="Refunded">Refunded</option>
                                </Form.Select>
                            </Col>

                            <Col lg={2}>
                                <Form.Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                                    <option value="all">All Dates</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </Form.Select>
                            </Col>
                            <Col lg={2}>
                                <Form.Select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                                    <option value="all">All Prices</option>
                                    <option value="low">Under ₱5,000</option>
                                    <option value="medium">₱5,000 - ₱15,000</option>
                                    <option value="high">Over ₱15,000</option>
                                </Form.Select>
                            </Col>
                            <Col lg={2}>
                                <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="price-high">Price High</option>
                                    <option value="price-low">Price Low</option>
                                    <option value="status">Status</option>
                                </Form.Select>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-white border-bottom-0 py-3">
                        <div className="d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Customized Orders ({filteredOrders.length})</h5>
                            <div className="d-flex gap-2">
                                <Badge bg="success">{filteredOrders.filter(o => getOrderStatusColor(o) === "success").length} On Track</Badge>
                                <Badge bg="warning">{filteredOrders.filter(o => getOrderStatusColor(o) === "warning").length} Nearing Deadline</Badge>
                                <Badge bg="danger">{filteredOrders.filter(o => getOrderStatusColor(o) === "danger").length} Overdue</Badge>
                            </div>
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        <div className="table-responsive">
                            <Table className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th className="border-0 fw-semibold">Order ID</th>
                                        <th className="border-0 fw-semibold">Customer</th>
                                        <th className="border-0 fw-semibold">Custom Items</th>
                                        <th className="border-0 fw-semibold">Dimensions (H×W×L)</th>
                                        <th className="border-0 fw-semibold">Materials</th>
                                        <th className="border-0 fw-semibold">Custom Price</th>
                                        <th className="border-0 fw-semibold">Order Date</th>
                                        <th className="border-0 fw-semibold">Status</th>
                                        <th className="border-0 fw-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order._id} className={`border-bottom ${getOrderStatusColor(order) === "danger" ? "table-danger" : getOrderStatusColor(order) === "warning" ? "table-warning" : ""}`}>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center">
                                                    <span className="font-monospace fw-medium">#{order._id.slice(-8)}</span>
                                                    {isNewOrder(order) && (
                                                        <Badge bg="success" className="ms-2">
                                                            NEW
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div>
                                                    <div className="fw-medium">{order.user?.name || "N/A"}</div>
                                                    <small className="text-muted">{order.user?.email}</small>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {order.items?.filter(item => item.customH && item.customW && item.customL).map((item, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="fw-medium">{item.item?.name}</span>
                                                            <span className="text-muted"> (×{item.quantity})</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small font-monospace">
                                                    {order.items?.filter(item => item.customH && item.customW && item.customL).map((item, idx) => (
                                                        <div key={idx}>{`${item.customH} × ${item.customW} × ${item.customL}`}</div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {order.items?.filter(item => item.item?.is_customizable).map((item, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="fw-medium">{item.item?.name}</span>


                                                            <span className="text-muted"> (×{item.quantity})</span>
                                                        </div>
                                                    ))}
                                                    {order.items?.filter(item => !item.item?.is_customizable).map((item, idx) => (
                                                        <div key={idx} className="mb-1">
                                                            <span className="fw-medium">{item.item?.name}</span>
                                                            <span className="text-muted"> (×{item.quantity})</span>
                                                        </div>
                                                    ))}
                                                    {order.items?.filter(item => item.legsFrameMaterial || item.tabletopMaterial).map((item, idx) => (
                                                        <div key={idx}>
                                                            {item.legsFrameMaterial && (
                                                                <Badge bg="secondary" className="me-1 mb-1">{item.legsFrameMaterial}  Legs and frame</Badge>
                                                            )}
                                                            {item.tabletopMaterial && (
                                                                <Badge bg="secondary" className="me-1 mb-1">{item.tabletopMaterial} Table Top</Badge>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <span className="fw-bold fs-6 text-primary">₱{order.customPrice?.toLocaleString()}</span>
                                            </td>
                                            <td className="py-3">
                                                <div className="small">
                                                    {new Date(order.createdAt).toLocaleDateString()}
                                                    <br />
                                                    <span className="text-muted">{new Date(order.createdAt).toLocaleTimeString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex align-items-center">
                                                    <Badge bg={getStatusVariant(order.status)} className="text-capitalize px-3 py-2 me-2">
                                                        {order.status}
                                                    </Badge>
                                                    <div className={`p-1 rounded-circle bg-${getOrderStatusColor(order)}`} style={{ width: "8px", height: "8px" }}></div>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <div className="d-flex gap-1">
                                                    <Form.Select
                                                        size="sm"
                                                        value={order.status}
                                                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                                                        style={{ minWidth: "120px" }}
                                                    >
                                                        <option value="On Process">On Process</option>
                                                        <option value="Delivered">Delivered</option>
                                                        {order.status === "Delivered" && (
                                                            <option value="Refunded">Refunded</option>
                                                        )}
                                                    </Form.Select>
                                                    {(order.status === "Delivered" || order.status === "On Process") && !order.deliveryProof && (
                                                        <Button
                                                            size="sm"
                                                            variant="success"
                                                            onClick={() => handleUploadDeliveryProof(order)}
                                                            title="Upload Delivery Proof"
                                                        >
                                                            📸
                                                        </Button>
                                                    )}
                                                    {order.deliveryProof && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline-info"
                                                            onClick={() => window.open(order.deliveryProof, '_blank')}
                                                            title="View Delivery Proof"
                                                        >
                                                            👁️
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center py-4 text-muted">
                                                No customized orders found matching your filters.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card.Body>
                </Card>
            </div>
        )
    }

    if (loading) {
        return (
            <Container
                fluid
                className="d-flex justify-content-center align-items-center bg-light"
                style={{ minHeight: "100vh" }}
            >
                <div className="text-center">
                    <Spinner animation="border" variant="primary" size="lg" />
                    <h4 className="mt-3 text-muted">Loading Dashboard...</h4>
                    <p className="text-muted">Please wait while we fetch your data</p>
                </div>
            </Container>
        )
    }

    return (
        <>


            <div className="d-flex" style={{ minHeight: "100vh" }}>
                {/* Mobile Sidebar */}
                <MobileSidebar />

                {/* Desktop Sidebar */}
                <div
                    className="d-none d-lg-block bg-dark text-white"
                    style={{ width: sidebarCollapsed ? "80px" : "280px", minHeight: "100vh", transition: "width 0.3s" }}
                >
                    <div className="p-4 border-bottom border-secondary d-flex align-items-center justify-content-between">
                        <h4 className="mb-0 fw-bold d-flex align-items-center">
                            <BsShop className={sidebarCollapsed ? "mx-auto" : "me-2"} />
                            {!sidebarCollapsed && "Manage Store"}
                        </h4>
                        <Button
                            variant="outline-light"
                            size="sm"
                            onClick={() => setSidebarCollapsed((prev) => !prev)}
                            className="border-0"
                        >
                            {sidebarCollapsed ? <BsArrowRight /> : <BsArrowLeft />}
                        </Button>
                    </div>
                    <Nav className="flex-column p-3" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="dashboard" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsBarChartFill className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Dashboard"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="items" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsBoxSeam className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Manage Products"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="orders" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsCartFill className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Manage Orders"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="customizedOrders" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsGear className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Customized Orders"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="users" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsPersonFill className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Manage Users"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="chat" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsChatDots className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Chat with Customer"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link
                                eventKey="categoriesandfurnituretypes"
                                className="text-white rounded d-flex align-items-center py-3 px-3"
                            >
                                <BsTagFill className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Categories and Furniture Types"}
                            </Nav.Link>
                        </Nav.Item>
                        <Nav.Item className="mb-2">
                            <Nav.Link eventKey="analytics" className="text-white rounded d-flex align-items-center py-3 px-3">
                                <BsBarChart className={sidebarCollapsed ? "mx-auto" : "me-3"} />
                                {!sidebarCollapsed && "Analytics"}
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                    <div className="mt-auto p-3 border-top border-secondary">
                        <Button variant="outline-light" size="sm" className="w-100" onClick={handleLogout}>
                            <BsPower className="me-2" />
                            {!sidebarCollapsed && "Logout"}
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-grow-1 bg-light">
                    {/* Navigation Bar */}
                    <Navbar bg="white" variant="light" expand="lg" className="py-3 border-bottom shadow-sm m-0">
                        <Container className="d-flex justify-content-center align-items-center">
                            <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: "#EE4D2D", textAlign: "center", alignItems: "center" }}>
                                <BsShop className="me-2" />
                                Wawa Furniture Admin Panel
                            </Navbar.Brand>


                        </Container>
                    </Navbar>
                    {/* Mobile Header */}
                    <Navbar bg="white" className="d-lg-none border-bottom shadow-sm">
                        <Container fluid>
                            <Button variant="outline-dark" size="sm" onClick={() => setShowSidebar(true)}>
                                <BsList />
                            </Button>
                            <Navbar.Brand className="fw-bold">
                                <BsShop className="me-2" />
                                WAWA ADMIN
                            </Navbar.Brand>
                            <Button variant="outline-danger" size="sm" onClick={handleLogout}>
                                <BsPower />
                            </Button>
                        </Container>
                    </Navbar>

                    <div className="p-4">
                        {activeTab === "dashboard" && <DashboardView />}
                        {activeTab === "orders" && <OrderManagementView />}
                        {activeTab === "customizedOrders" && <CustomizedOrdersView />}
                        {activeTab === "items" && <ItemManagementView />}
                        {activeTab === "users" && <UserManagementView />}

                        {activeTab === "categoriesandfurnituretypes" && <StoreSettingsView />}
                        {activeTab === "chat" && <ChatPage />}
                        {activeTab === "analytics" && <AnalyticsView />}
                    </div>
                </div>
            </div>
        </>
    )
}

export default AdminPage
