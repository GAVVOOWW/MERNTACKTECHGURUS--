"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { useParams, useNavigate, Link } from "react-router-dom"
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Alert,
  Spinner,
  Badge,
  Table,
  Navbar,
  Nav,
  Breadcrumb,
  ListGroup,
  ProgressBar,
} from "react-bootstrap"
import {
  BsArrowLeft,
  BsReceipt,
  BsInfoCircle,
  BsCurrencyDollar,
  BsBoxSeam,
  BsCheckCircle,
  BsXCircle,
  BsClock,
  BsTruck,
  BsExclamationTriangle,
  BsShop,
  BsCart,
  BsPerson,
  BsBoxArrowRight,
  BsListUl,
  BsChatDots,
  BsClipboardCheck,
  BsDownload,
  BsPrinter,
  BsGeoAlt,
  BsPhone,
  BsEnvelope,
  BsShield,
  BsStarFill,
  BsHeart,
  BsShare,
  BsCartPlus,
  BsGear,
} from "react-icons/bs"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [orderProgress, setOrderProgress] = useState(0)
  const [refundLoading, setRefundLoading] = useState(false)

  const userRole = localStorage.getItem("role")

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/orders/${id}/status`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        })
        setOrder(response.data)

        console.log("=== ORDER DETAILS LOADED ===")
        console.log("Order data:", response.data)
        console.log("Order status:", response.data.status)
        console.log("Order items:", response.data.items)
        console.log("User role:", userRole)

        // Calculate order progress based on status
        const status = response.data.status
        switch (status) {
          case "On Process":
            setOrderProgress(50)
            break
          case "Delivered":
            setOrderProgress(1000)
            break
          case "Requesting for Refund":
            setOrderProgress(0)
            break
          case "Refunded":
            setOrderProgress(0)
            break
          case "Cancelled":
            setOrderProgress(0)
            break
          default:
            setOrderProgress(25)
        }

      } catch (err) {
        setError(err.response?.data?.message || "Error fetching order details")
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [id])

  // Log refund eligibility when order changes
  useEffect(() => {
    if (order) {
      console.log("=== REFUND ELIGIBILITY CHECK (Order Updated) ===")
      const canRefund = canRequestRefund()
      console.log("Can request refund:", canRefund)
      console.log("Refund button tooltip:", getRefundButtonTooltip())
    }
  }, [order])

  const getStatusVariant = (status) => {
    switch (status) {
      case "Delivered":
      case "Refunded":
        return "success"
      case "On Process":
        return "primary"
      case "Requesting for Refund":
        return "info"
      case "Cancelled":
        return "danger"
      default:
        return "secondary"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "Delivered":
      case "Refunded":
        return <BsCheckCircle />
      case "On Process":
        return <BsClock />
      case "Requesting for Refund":
        return <BsExclamationTriangle />
      case "Cancelled":
        return <BsXCircle />
      default:
        return <BsInfoCircle />
    }
  }

  const getProgressVariant = (status) => {
    switch (status) {
      case "Delivered":
      case "Refunded":
        return "success"
      case "On Process":
        return "primary"
      case "Requesting for Refund":
        return "info"
      case "Cancelled":
        return "danger"
      default:
        return "warning"
    }
  }

  const handleReorder = () => {
    // Navigate to cart with these items
    navigate("/cart", { state: { reorderItems: order.items } })
  }

  const handleDownloadReceipt = () => {
    // Implement download receipt functionality
    console.log("Downloading receipt for order:", order._id)
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  const handleRefundRequest = async () => {
    console.log("=== REFUND REQUEST STARTED ===")
    console.log("Order ID:", order._id)
    console.log("Order status:", order.status)
    console.log("Order items:", order.items)

    // Check if order is in "On Process" status
    if (order.status !== "On Process") {
      console.log("ERROR: Order is not in 'On Process' status. Current status:", order.status)
      alert("Refund requests can only be made for orders that are currently being processed.")
      return
    }

    // Check if any items are customized
    const hasCustomizedItems = order.items.some(item => {
      const isCustomized = item.item?.is_customizable || false
      console.log(`Item ${item.item?.name}: is_customizable = ${isCustomized}`)
      return isCustomized
    })

    console.log("Has customized items:", hasCustomizedItems)

    if (hasCustomizedItems) {
      console.log("ERROR: Order contains customized items. Refund not allowed.")
      alert("Refund requests cannot be made for orders containing customized items.")
      return
    }

    // Confirm refund request
    const confirmed = window.confirm(
      "Are you sure you want to request a refund for this order? This action cannot be undone."
    )

    if (!confirmed) {
      console.log("User cancelled refund request")
      return
    }

    console.log("User confirmed refund request. Proceeding...")

    setRefundLoading(true)

    try {
      console.log("=== SENDING REFUND REQUEST TO BACKEND ===")
      const refundUrl = `${BACKEND_URL}/api/orders/${order._id}/request-refund`
      const response = await axios.put(
        refundUrl,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      )

      console.log("=== REFUND REQUEST RESPONSE ===")
      console.log("Response status:", response.status)
      console.log("Response data:", response.data)

      alert("Refund request submitted successfully! We will review your request and contact you soon.")

      // Refresh order data to show updated status
      console.log("Refreshing order data...")
      const updatedResponse = await axios.get(`${BACKEND_URL}/api/orders/${id}/status`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      console.log("Updated order data:", updatedResponse.data)
      setOrder(updatedResponse.data)

    } catch (error) {
      console.log("=== REFUND REQUEST ERROR ===")
      console.error("Error requesting refund:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)

      const errorMessage = error.response?.data?.message || "Failed to submit refund request. Please try again."
      alert(errorMessage)
    } finally {
      setRefundLoading(false)
      console.log("=== REFUND REQUEST COMPLETED ===")
    }
  }

  const canRequestRefund = () => {
    console.log("=== CHECKING REFUND ELIGIBILITY ===")
    console.log("Order status:", order?.status)
    console.log("User role:", userRole)
    console.log("Order exists:", !!order)
    console.log("Order items:", order?.items)

    // Only customers can request refunds (not admins)
    if (userRole === "admin") {
      console.log("User is admin - cannot request refund")
      return false
    }

    // Only "On Process" orders can be refunded
    if (order?.status !== "On Process") {
      console.log("Order is not in 'On Process' status - cannot request refund")
      console.log("Expected: 'On Process', Got:", order?.status)
      return false
    }

    // Check if any items are customized
    const hasCustomizedItems = order?.items?.some(item => {
      const isCustomized = item.item?.is_customizable || false
      console.log(`Item ${item.item?.name}: is_customizable = ${isCustomized}`)
      return isCustomized
    })

    console.log("Has customized items:", hasCustomizedItems)

    if (hasCustomizedItems) {
      console.log("Order has customized items - cannot request refund")
      return false
    }

    console.log("✅ Order is eligible for refund request")
    return true
  }

  const getRefundButtonTooltip = () => {
    if (userRole === "admin") {
      return "Admins cannot request refunds"
    }

    if (order?.status !== "On Process") {
      return "Refund requests can only be made for orders that are currently being processed"
    }

    const hasCustomizedItems = order?.items?.some(item => item.item?.is_customizable || false)
    if (hasCustomizedItems) {
      return "Refund requests cannot be made for orders containing customized items"
    }

    return "Request a refund for this order"
  }

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: "100vh" }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: "4rem", height: "4rem" }} />
          <p className="mt-3 text-muted">Loading order details...</p>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="shadow-sm">
          <Alert.Heading>
            <BsExclamationTriangle className="me-2" />
            Error Loading Order
          </Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end gap-2">
            <Button variant="outline-secondary" onClick={() => navigate(-1)}>
              <BsArrowLeft className="me-2" />
              Go Back
            </Button>
            <Button variant="outline-danger" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    )
  }

  return (
    <>
      {/* Navigation Bar */}
      <Navbar bg="white" variant="light" expand="lg" sticky="top" className="py-3 border-bottom shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: "#EE4D2D" }}>
            <BsShop className="me-2" />
            Wawa Furniture
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" className="fw-medium">
                <BsShop className="me-1" />
                Shop
              </Nav.Link>
              <Nav.Link as={Link} to="/cart" className="fw-medium">
                <BsCart className="me-1" />
                Cart
              </Nav.Link>
              <Nav.Link as={Link} to="/orders" className="fw-medium">
                <BsClipboardCheck className="me-1" />
                My Orders
              </Nav.Link>
            </Nav>
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/profile" className="fw-medium">
                <BsPerson className="me-1" />
                Profile
              </Nav.Link>
              {userRole === "admin" && (
                <Nav.Link as={Link} to="/admin" className="fw-medium">
                  <BsListUl className="me-1" />
                  Admin Panel
                </Nav.Link>
              )}
              <Nav.Link as={Link} to="/chat" className="fw-medium">
                <BsChatDots className="me-1" />
                Chat
              </Nav.Link>
              <Nav.Link
                onClick={() => {
                  localStorage.clear()
                  navigate("/")
                }}
                className="fw-medium text-danger"
              >
                <BsBoxArrowRight className="me-1" />
                Logout
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="my-5">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
            <BsShop className="me-1" />
            Shop
          </Breadcrumb.Item>
          <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/orders" }}>
            <BsClipboardCheck className="me-1" />
            My Orders
          </Breadcrumb.Item>
          <Breadcrumb.Item active>Order #{order._id?.slice(-8)}</Breadcrumb.Item>
        </Breadcrumb>

        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">
              <BsReceipt className="me-2 text-primary" />
              Order Details
            </h2>
            <p className="text-muted mb-0">Track your order and view details</p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => navigate(-1)}>
              <BsArrowLeft className="me-2" />
              Back to Orders
            </Button>
            <Button variant="outline-primary" onClick={handleDownloadReceipt}>
              <BsDownload className="me-2" />
              Download
            </Button>
            <Button variant="outline-secondary" onClick={handlePrintReceipt}>
              <BsPrinter className="me-2" />
              Print
            </Button>
          </div>
        </div>

        <Row>
          {/* Order Information */}
          <Col lg={8} className="mb-4">
            {/* Order Status Card */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-bottom">
                <h5 className="mb-0 fw-bold">
                  <BsInfoCircle className="me-2 text-primary" />
                  Order Status
                </h5>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-center mb-3">
                  <Col md={8}>
                    <div className="d-flex align-items-center mb-2">
                      <Badge bg={getStatusVariant(order.status)} className="d-flex align-items-center me-3">
                        {getStatusIcon(order.status)}
                        <span className="ms-1 text-capitalize">{order.status}</span>
                      </Badge>
                      <span className="text-muted">
                        {order.status === "Delivered" && "Your order has been delivered successfully!"}
                        {order.status === "On Process" && "Your order is being prepared for shipment."}
                        {order.status === "Requesting for Refund" && "Your refund request is being processed."}
                        {order.status === "Refunded" && "Your refund has been processed."}
                        {order.status === "Cancelled" && "This order has been cancelled."}
                      </span>
                    </div>
                    <ProgressBar
                      now={orderProgress}
                      variant={getProgressVariant(order.status)}
                      className="mb-2"
                      style={{ height: "8px" }}
                    />
                    <div className="d-flex justify-content-between small text-muted">
                      <span>Order Placed</span>
                      <span>Processing</span>
                      <span>Delivered</span>
                      <span>Completed</span>
                    </div>
                  </Col>
                  <Col md={4} className="text-end">
                    {order.status === "Delivered" && (
                      <Button variant="outline-primary" size="sm" onClick={handleReorder}>
                        <BsCartPlus className="me-1" />
                        Reorder Items
                      </Button>
                    )}
                    {canRequestRefund() && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        onClick={handleRefundRequest}
                        disabled={refundLoading}
                        title={getRefundButtonTooltip()}
                        className="ms-2"
                      >
                        {refundLoading ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-1" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <BsExclamationTriangle className="me-1" />
                            Request Refund
                          </>
                        )}
                      </Button>
                    )}
                    {!canRequestRefund() && order.status === "On Process" && userRole !== "admin" && (
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled
                        title={getRefundButtonTooltip()}
                        className="ms-2"
                      >
                        <BsExclamationTriangle className="me-1" />
                        Request Refund
                      </Button>
                    )}

                    {/* Debug Info - Remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 small text-muted">
                        <div>Status: {order.status}</div>
                        <div>Role: {userRole}</div>
                        <div>Can Refund: {canRequestRefund() ? 'Yes' : 'No'}</div>
                        <div>Has Customized: {order.items?.some(item => item.item?.is_customizable) ? 'Yes' : 'No'}</div>
                      </div>
                    )}
                  </Col>
                </Row>

                {/* Delivery Proof Section */}
                {order.status === "Delivered" && order.deliveryProof && (
                  <div className="mt-4 p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-3">
                      <BsCheckCircle className="text-success me-2" size={20} />
                      <h6 className="mb-0 fw-bold text-success">Delivery Proof Uploaded</h6>
                    </div>
                    <div className="text-center">
                      <img
                        src={order.deliveryProof}
                        alt="Delivery Proof"
                        className="img-fluid rounded shadow-sm"
                        style={{ maxHeight: "300px", maxWidth: "100%" }}
                      />
                      <div className="mt-2">
                        <small className="text-muted">
                          Delivery proof uploaded on: {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : 'N/A'}
                        </small>
                      </div>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Order Information Card */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-white border-bottom">
                <h5 className="mb-0 fw-bold">
                  <BsReceipt className="me-2 text-primary" />
                  Order Information
                </h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <ListGroup variant="flush">
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Order ID:</span>
                          <span className="fw-bold font-monospace">#{order._id?.slice(-8)}</span>
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Order Date:</span>
                          <span className="fw-medium">{new Date(order.createdAt).toLocaleDateString()}</span>
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Order Time:</span>
                          <span className="fw-medium">{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </ListGroup.Item>
                    </ListGroup>
                  </Col>
                  <Col md={6}>
                    <ListGroup variant="flush">
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Payment Method:</span>
                          <span className="fw-medium">Credit Card</span>
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Shipping Method:</span>
                          <span className="fw-medium">Standard Delivery</span>
                        </div>
                      </ListGroup.Item>
                      <ListGroup.Item className="px-0 py-2 border-0">
                        <div className="d-flex justify-content-between">
                          <span className="text-muted">Expected Delivery:</span>
                          <span className="fw-medium">3-5 business days</span>
                        </div>
                      </ListGroup.Item>
                    </ListGroup>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Order Items */}
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-bottom">
                <h5 className="mb-0 fw-bold">
                  <BsBoxSeam className="me-2 text-primary" />
                  Order Items ({order.items?.length || 0})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Product</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th>Subtotal</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <img
                                src={item.item?.imageUrl?.[0] || "https://via.placeholder.com/60"}
                                alt={item.item?.name}
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  objectFit: "cover",
                                  borderRadius: "8px",
                                }}
                                className="me-3"
                              />
                              <div>
                                <div className="fw-medium">{item.item?.name || "Item not available"}</div>
                                <small className="text-muted">
                                  {item.item?.category?.name && `Category: ${item.item.category.name}`}
                                </small>
                                {item.item?.is_bestseller && (
                                  <div>
                                    <Badge bg="warning" text="dark" className="mt-1">
                                      <BsStarFill className="me-1" />
                                      Bestseller
                                    </Badge>
                                  </div>
                                )}
                                {item.item?.is_customizable && (
                                  <div>
                                    <Badge bg="info" text="dark" className="mt-1">
                                      <BsGear className="me-1" />
                                      Customized
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="fw-bold text-primary">₱{item.price?.toFixed(2)}</span>
                          </td>
                          <td>
                            <Badge bg="light" text="dark" className="fs-6">
                              {item.quantity}
                            </Badge>
                          </td>
                          <td>
                            <span className="fw-bold">₱{((item.price || 0) * item.quantity).toFixed(2)}</span>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              {item.item && (
                                <>
                                  <Button variant="outline-primary" size="sm" as={Link} to={`/item/${item.item._id}`}>
                                    <BsBoxSeam />
                                  </Button>
                                  <Button variant="outline-secondary" size="sm">
                                    <BsHeart />
                                  </Button>
                                  <Button variant="outline-secondary" size="sm">
                                    <BsShare />
                                  </Button>
                                </>
                              )}
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

          {/* Order Summary Sidebar */}
          <Col lg={4}>
            <div className="sticky-top" style={{ top: "7rem" }}>
              {/* Order Summary */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom">
                  <h5 className="mb-0 fw-bold">
                    <BsCurrencyDollar className="me-2 text-success" />
                    Order Summary
                  </h5>
                </Card.Header>
                <Card.Body>
                  <ListGroup variant="flush">
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3">
                      <span>Subtotal ({order.items?.length || 0} items)</span>
                      <span className="fw-bold">₱{order.amount?.toFixed(2)}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3">
                      <span>
                        <BsTruck className="me-1 text-success" />
                        Shipping
                      </span>
                      <span className="text-success fw-bold">FREE</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3">
                      <span>Tax</span>
                      <span className="fw-bold">₱0.00</span>
                    </ListGroup.Item>
                    <ListGroup.Item className="d-flex justify-content-between align-items-center px-0 py-3 border-top">
                      <span className="fw-bold fs-5">Total</span>
                      <span className="fw-bold fs-4 text-primary">₱{order.amount?.toFixed(2)}</span>
                    </ListGroup.Item>
                  </ListGroup>
                </Card.Body>
              </Card>

              {/* Delivery Information */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom">
                  <h5 className="mb-0 fw-bold">
                    <BsGeoAlt className="me-2 text-info" />
                    Delivery Information
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="mb-3">
                    <div className="fw-medium mb-1">Shipping Address</div>
                    <div className="text-muted">
                      {order.address ?
                        (typeof order.address === 'string' ?
                          order.address :
                          [
                            order.address.fullName,
                            order.address.addressLine1,
                            order.address.addressLine2,
                            order.address.cityName || order.address.city,
                            order.address.provinceName || order.address.state,
                            order.address.postalCode
                          ].filter(Boolean).join(", ")
                        ) :
                        "123 Main Street, Tanay, Rizal, Philippines"
                      }
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="fw-medium mb-1">Contact Information</div>
                    <div className="text-muted">
                      <BsPhone className="me-2" />
                      {order.phone || "+63 912 345 6789"}
                    </div>
                    <div className="text-muted">
                      <BsEnvelope className="me-2" />
                      {order.user?.email || "customer@email.com"}
                    </div>
                  </div>
                  <div>
                    <div className="fw-medium mb-1">Delivery Instructions</div>
                    <div className="text-muted small">Please call upon arrival. Leave at front door if no answer.</div>
                  </div>
                </Card.Body>
              </Card>

              {/* Help & Support */}
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <h5 className="mb-0 fw-bold">
                    <BsShield className="me-2 text-warning" />
                    Need Help?
                  </h5>
                </Card.Header>
                <Card.Body>
                  <div className="d-grid gap-2">
                    <Button variant="outline-primary" as={Link} to="/chat">
                      <BsChatDots className="me-2" />
                      Chat with Support
                    </Button>
                    <Button variant="outline-secondary">
                      <BsPhone className="me-2" />
                      Call Customer Service
                    </Button>
                    <Button variant="outline-info">
                      <BsEnvelope className="me-2" />
                      Email Support
                    </Button>
                  </div>
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">
                      <BsShield className="me-1" />
                      Your order is protected by our buyer protection policy.
                    </small>
                  </div>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default OrderDetail
