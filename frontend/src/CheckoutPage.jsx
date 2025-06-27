"use client"

import { useState, useEffect } from "react"
import { useLocation, useNavigate, Link } from "react-router-dom"
import axios from "axios"
import {
  Container,
  Row,
  Col,
  Button,
  Alert,
  Spinner,
  Navbar,
  Card,
  ListGroup,
  Form,
  Breadcrumb,
  Nav,
  Badge,
  InputGroup,
  ProgressBar,
  Modal,
} from "react-bootstrap"
import {
  BsShop,
  BsCart,
  BsClipboardCheck,
  BsListUl,
  BsChatDots,
  BsBoxArrowRight,
  BsHouse,
  BsCreditCard2Front,
  BsWallet2,
  BsTruck,
  BsShop as BsStore,
  BsCheckCircle,
  BsExclamationTriangle,
  BsInfoCircle,
  BsCalendar,
  BsGeoAlt,
  BsPersonFill,
  BsPhone,
  BsShield,
  BsClock,
  BsBoxSeam,
  BsArrowLeft,
  BsPencil,
  BsCheck,
  BsX,
} from "react-icons/bs"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const CheckoutPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentStep, setCurrentStep] = useState(1)

  // Delivery and Shipping State
  const [deliveryOption, setDeliveryOption] = useState("shipping")
  const [shippingFee, setShippingFee] = useState(0)
  const [scheduledDate, setScheduledDate] = useState("")
  const [isDateConfirmed, setIsDateConfirmed] = useState(false)

  // Address dropdown state
  const [provinces, setProvinces] = useState([])
  const [cities, setCities] = useState([])
  const [barangays, setBarangays] = useState([])
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false)

  // Shipping information state
  const [shippingInfo, setShippingInfo] = useState(() => {
    const stored = localStorage.getItem("shippingInfo")
    return stored
      ? JSON.parse(stored)
      : {
        fullName: "",
        addressLine1: "",
        addressLine2: "",
        province: "",
        provinceName: "",
        city: "",
        cityName: "",
        brgy: "",
        brgyName: "",
        postalCode: "",
        phone: "",
      }
  })
  const [isEditingShipping, setIsEditingShipping] = useState(!shippingInfo.fullName)
  const [showAddressModal, setShowAddressModal] = useState(false)

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState("card")

  // Items passed from the previous page
  const allItems = location.state?.selectedItems || []

  // State to track which items are selected
  const [selected, setSelected] = useState(
    allItems.reduce((acc, entry) => {
      if (entry.item) {
        acc[entry.item._id] = true
      }
      return acc
    }, {}),
  )

  const userRole = localStorage.getItem("role")

  // Fetch geographic data
  useEffect(() => {
    const fetchProvinces = async () => {
      setIsLoadingProvinces(true)
      try {
        const response = await axios.get(`${BACKEND_URL}/api/psgc/provinces?filter=metro-rizal`)
        const filtered = response.data.filter((p) => p.name === "Metro Manila" || p.name === "Rizal")
        setProvinces(filtered)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch provinces:", err)
        setError("Could not load province data. Please try refreshing.")
      } finally {
        setIsLoadingProvinces(false)
      }
    }
    fetchProvinces()
  }, [])

  // Fetch cities when province changes
  useEffect(() => {
    if (!shippingInfo.province) return

    let url
    if (shippingInfo.province === "NCR") {
      url = `${BACKEND_URL}/api/psgc/regions/130000000/cities`
    } else {
      url = `${BACKEND_URL}/api/psgc/provinces/${shippingInfo.province}/cities`
    }

    const fetchCities = async () => {
      setIsLoadingCities(true)
      setCities([])
      setBarangays([])
      setShippingInfo((prev) => ({
        ...prev,
        city: "",
        cityName: "",
        brgy: "",
        brgyName: "",
      }))

      try {
        const response = await axios.get(url)
        setCities(response.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch cities:", err)
        setError("Could not load city data.")
      } finally {
        setIsLoadingCities(false)
      }
    }

    fetchCities()
  }, [shippingInfo.province])

  // Fetch barangays when city changes
  useEffect(() => {
    if (!shippingInfo.city) return

    const fetchBarangays = async () => {
      setIsLoadingBarangays(true)
      setBarangays([])
      setShippingInfo((prev) => ({ ...prev, brgy: "", brgyName: "" }))

      try {
        const response = await axios.get(`${BACKEND_URL}/api/psgc/cities/${shippingInfo.city}/barangays`)
        setBarangays(response.data)
        setError(null)
      } catch (err) {
        console.error("Failed to fetch barangays:", err)
        setError("Could not load barangay data.")
      } finally {
        setIsLoadingBarangays(false)
      }
    }

    fetchBarangays()
  }, [shippingInfo.city])

  // Calculate shipping fee
  useEffect(() => {
    if (deliveryOption === "shipping" && shippingInfo.provinceName) {
      if (shippingInfo.provinceName === "Rizal") {
        setShippingFee(1000)
      } else if (shippingInfo.provinceName === "Metro Manila") {
        setShippingFee(1500)
      } else {
        setShippingFee(0)
        setError("Sorry, we only deliver to Metro Manila and Rizal at the moment.")
      }
    } else {
      setShippingFee(0)
    }
  }, [shippingInfo.provinceName, deliveryOption])

  // Filter selected items and calculate totals
  const selectedItems = allItems.filter((entry) => entry.item && selected[entry.item._id])
  const total = selectedItems.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)
  const grandTotal = total + shippingFee

  const handleSelect = (itemId) => {
    setSelected((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }))
  }

  const handleSaveShippingInfo = async () => {
    const requiredFields = [
      shippingInfo.fullName,
      shippingInfo.addressLine1,
      shippingInfo.city,
      shippingInfo.province,
      shippingInfo.brgy,
      shippingInfo.postalCode,
      shippingInfo.phone,
    ]
    if (requiredFields.some((f) => !f)) {
      setError("Please fill out all required address fields before saving.")
      return
    }

    try {
      await axios.put(`${BACKEND_URL}/api/user/address`, shippingInfo, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      localStorage.setItem("shippingInfo", JSON.stringify(shippingInfo))
      setIsEditingShipping(false)
      setShowAddressModal(false)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save address. Please try again.")
    }
  }

  const handleCheckout = async () => {
    console.log("=== CHECKOUT PROCESS STARTED ===");
    console.log("Selected items:", selectedItems);
    console.log("Delivery option:", deliveryOption);
    console.log("Shipping info:", shippingInfo);
    console.log("Scheduled date:", scheduledDate);
    console.log("Shipping fee:", shippingFee);
    console.log("Grand total:", grandTotal);

    // Validation
    if (selectedItems.length === 0) {
      console.log("ERROR: No items selected");
      setError("Please select at least one item to check out.")
      return
    }

    if (deliveryOption === "shipping") {
      const requiredFields = [
        shippingInfo.fullName,
        shippingInfo.addressLine1,
        shippingInfo.city,
        shippingInfo.province,
        shippingInfo.brgy,
        shippingInfo.postalCode,
        shippingInfo.phone,
      ]
      console.log("Required shipping fields:", requiredFields);
      if (requiredFields.some((f) => !f)) {
        console.log("ERROR: Missing shipping fields");
        setError("Please complete your shipping information before checking out.")
        return
      }
      if (shippingFee === 0 && shippingInfo.province) {
        console.log("ERROR: Shipping not available for province");
        setError(
          "Shipping is not available for the selected province. Please choose another address or select store pickup.",
        )
        return
      }
      if (!scheduledDate || !isDateConfirmed) {
        console.log("ERROR: No delivery date confirmed");
        setError("Please select and confirm a delivery date before checking out.")
        return
      }
    }

    setIsLoading(true)
    setError(null)

    // Prepare order data
    const itemIds = selectedItems.map((entry) => entry.item._id)
    const userId = localStorage.getItem("userId") || "anon";
    const counterKey = `orderCounter_${userId}`;
    let counter = parseInt(localStorage.getItem(counterKey) || "0", 10);
    counter += 1;
    localStorage.setItem(counterKey, counter);
    const transactionHash = `${userId}-${counter}`;

    const orderData = {
      user: userId,
      amount: grandTotal,
      deliveryOption: deliveryOption,
      shippingFee: shippingFee,
      scheduledDate: deliveryOption === "shipping" ? scheduledDate : null,
      transactionHash,
      paymentMethod,
      shippingInfo: deliveryOption === "shipping" ? shippingInfo : null,
      items: selectedItems.map((entry) => ({
        item: entry.item._id,
        quantity: entry.quantity,
        price: entry.item.price,
        customH: entry.item.customH ?? null,
        customW: entry.item.customW ?? null,
        customL: entry.item.customL ?? null,
        legsFrameMaterial: entry.item.legsFrameMaterial ?? null,
        tabletopMaterial: entry.item.tabletopMaterial ?? null,
      })),
    }

    console.log("=== ORDER DATA PREPARED ===");
    console.log("Order data to be saved:", orderData);
    console.log("Item IDs to remove from cart:", itemIds);

    localStorage.removeItem("orderProcessed")
    localStorage.setItem("orderData", JSON.stringify(orderData))
    localStorage.setItem("checkedOutItemIds", JSON.stringify(itemIds))

    console.log("Order data saved to localStorage");

    try {
      const itemsPayload = selectedItems.map((entry) => ({
        id: entry.item._id,
        name: entry.item.name,
        price: entry.item.price,
        quantity: entry.quantity,
      }))

      console.log("=== PAYMONGO PAYLOAD ===");
      console.log("Items payload for PayMongo:", itemsPayload);
      console.log("Total amount for PayMongo:", grandTotal);

      const response = await axios.post(
        `${BACKEND_URL}/api/create-checkout-session`,
        {
          amount: grandTotal,
          items: itemsPayload,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )

      console.log("=== PAYMONGO RESPONSE ===");
      console.log("PayMongo checkout URL:", response.data.checkoutUrl);

      window.location.href = response.data.checkoutUrl
    } catch (err) {
      console.log("=== PAYMONGO ERROR ===");
      console.error("PayMongo error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Failed to process payment. Please try again.")
      setIsLoading(false)
    }
  }

  // Load saved address
  useEffect(() => {
    const loadAddress = async () => {
      try {
        const userId = localStorage.getItem("userId")
        const token = localStorage.getItem("token")
        if (!userId || !token) return

        const res = await axios.get(`${BACKEND_URL}/api/singleusers/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        const { address = {}, phone: savedPhone } = res.data?.UserData || {}
        const latest = {
          fullName: address.fullName || "",
          addressLine1: address.addressLine1 || "",
          addressLine2: address.addressLine2 || "",
          province: address.provinceCode || "",
          provinceName: address.provinceName || "",
          city: address.cityCode || "",
          cityName: address.cityName || "",
          brgy: address.brgyCode || "",
          brgyName: address.brgyName || "",
          postalCode: address.postalCode || "",
          phone: savedPhone || "",
        }

        setShippingInfo((prev) => ({ ...prev, ...latest }))
        localStorage.setItem("shippingInfo", JSON.stringify({ ...shippingInfo, ...latest }))
      } catch (err) {
        console.error("Failed to load saved address:", err)
      }
    }

    loadAddress()
  }, [])

  const getStepProgress = () => {
    if (deliveryOption === "pickup") return 75 // Skip shipping steps for pickup
    if (currentStep === 1) return 25
    if (currentStep === 2) return 50
    if (currentStep === 3) return 75
    return 100
  }

  return (
    <>
      {/* Navigation Bar */}
      <Navbar bg="white" variant="light" expand="lg" sticky="top" className="py-3 border-bottom shadow-sm">
        <Container fluid>
          <Navbar.Brand as={Link} to="/" className="fw-bold fs-3" style={{ color: "#EE4D2D" }}>
            <BsShop className="me-2" />
            Wawa Furniture
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" className="fw-medium d-flex align-items-center">
                <BsHouse className="me-1" />
                Shop
              </Nav.Link>
              <Nav.Link as={Link} to="/cart" className="fw-medium d-flex align-items-center">
                <BsCart className="me-1" />
                Cart
              </Nav.Link>
              <Nav.Link as={Link} to="/orders" className="fw-medium d-flex align-items-center">
                <BsClipboardCheck className="me-1" />
                My Orders
              </Nav.Link>
            </Nav>
            <Nav className="ms-auto">
              {userRole === "admin" && (
                <Nav.Link as={Link} to="/admin" className="fw-medium d-flex align-items-center">
                  <BsListUl className="me-1" />
                  Admin
                </Nav.Link>
              )}
              {userRole === "user" && (
                <Nav.Link as={Link} to="/chat" className="fw-medium d-flex align-items-center">
                  <BsChatDots className="me-1" />
                  Support
                </Nav.Link>
              )}
              <Nav.Link
                onClick={() => {
                  localStorage.clear()
                  navigate("/")
                }}
                className="fw-medium text-danger d-flex align-items-center"
              >
                <BsBoxArrowRight className="me-1" />
                Logout
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Container className="my-4">
        {/* Breadcrumb */}


        {/* Page Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h2 className="fw-bold mb-1">Secure Checkout</h2>
            <p className="text-muted mb-0">Complete your order safely and securely</p>
          </div>
          <Badge bg="primary" className="px-3 py-2">
            <BsShield className="me-1" />
            SSL Secured
          </Badge>
        </div>

        {/* Progress Bar */}
        <Card className="border-0 shadow-sm mb-4">
          <Card.Body className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="fw-semibold mb-0">Checkout Progress</h6>
              <span className="text-muted">{Math.round(getStepProgress())}% Complete</span>
            </div>
            <ProgressBar now={getStepProgress()} style={{ height: "8px" }} className="mb-3" />
            <div className="d-flex justify-content-between">
              <small className="text-muted">
                <BsCart className="me-1" />
                Cart Review
              </small>
              <small className="text-muted">
                <BsTruck className="me-1" />
                Delivery
              </small>
              <small className="text-muted">
                <BsCreditCard2Front className="me-1" />
                Payment
              </small>
              <small className="text-muted">
                <BsCheckCircle className="me-1" />
                Complete
              </small>
            </div>
          </Card.Body>
        </Card>

        {error && (
          <Alert variant="danger" className="border-0 shadow-sm mb-4">
            <div className="d-flex align-items-center">
              <BsExclamationTriangle className="me-3 fs-5" />
              <div>
                <strong>Error:</strong> {error}
              </div>
            </div>
          </Alert>
        )}

        {allItems.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center py-5">
              <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                <BsCart size={48} className="text-muted" />
              </div>
              <h4 className="fw-bold mb-2">Your cart is empty</h4>
              <p className="text-muted mb-4">There's nothing to check out. Please add items to your cart first.</p>
              <Button variant="primary" onClick={() => navigate("/")}>
                <BsArrowLeft className="me-2" />
                Back to Shop
              </Button>
            </Card.Body>
          </Card>
        ) : (
          <Row className="g-4">
            {/* Left Column: Checkout Steps */}
            <Col lg={8}>
              {/* Step 1: Delivery Option */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom">
                  <div className="d-flex align-items-center">
                    <div
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: "32px", height: "32px" }}
                    >
                      <span className="fw-bold">1</span>
                    </div>
                    <h5 className="mb-0 fw-semibold">Choose Delivery Option</h5>
                  </div>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Card
                        className={`h-100 cursor-pointer border-2 ${deliveryOption === "shipping" ? "border-primary bg-primary bg-opacity-10" : "border-light"
                          }`}
                        onClick={() => {
                          setDeliveryOption("shipping")
                          setError(null)
                        }}
                      >
                        <Card.Body className="text-center p-4">
                          <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <BsTruck className="text-primary" size={24} />
                          </div>
                          <h6 className="fw-bold mb-2">Home Delivery</h6>
                          <p className="text-muted small mb-3">Get your items delivered to your doorstep</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <BsClock className="me-1" />
                              2-5 days
                            </small>
                            <Badge bg="warning" text="dark">
                              ₱{shippingFee > 0 ? shippingFee.toLocaleString() : "Varies"}
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card
                        className={`h-100 cursor-pointer border-2 ${deliveryOption === "pickup" ? "border-success bg-success bg-opacity-10" : "border-light"
                          }`}
                        onClick={() => {
                          setDeliveryOption("pickup")
                          setError(null)
                        }}
                      >
                        <Card.Body className="text-center p-4">
                          <div className="bg-success bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
                            <BsStore className="text-success" size={24} />
                          </div>
                          <h6 className="fw-bold mb-2">Store Pickup</h6>
                          <p className="text-muted small mb-3">Pick up from our showroom when ready</p>
                          <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              <BsClock className="me-1" />
                              3-5 days
                            </small>
                            <Badge bg="success">FREE</Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Step 2: Delivery Details */}
              {deliveryOption === "shipping" ? (
                <>
                  {/* Shipping Address */}
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white border-bottom">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <div
                            className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                            style={{ width: "32px", height: "32px" }}
                          >
                            <span className="fw-bold">2</span>
                          </div>
                          <h5 className="mb-0 fw-semibold">Shipping Address</h5>
                        </div>
                        {!isEditingShipping && (
                          <Button variant="outline-primary" size="sm" onClick={() => setShowAddressModal(true)}>
                            <BsPencil className="me-1" />
                            Edit
                          </Button>
                        )}
                      </div>
                    </Card.Header>
                    <Card.Body className="p-4">
                      {isEditingShipping || !shippingInfo.fullName ? (
                        <Alert variant="info" className="d-flex align-items-center">
                          <BsInfoCircle className="me-2" />
                          <div>
                            <strong>Address Required:</strong> Please add your shipping address to continue.
                            <Button variant="link" className="p-0 ms-2" onClick={() => setShowAddressModal(true)}>
                              Add Address
                            </Button>
                          </div>
                        </Alert>
                      ) : (
                        <div className="bg-light p-4 rounded">
                          <div className="d-flex align-items-start">
                            <div className="bg-primary bg-opacity-10 p-2 rounded me-3">
                              <BsPersonFill className="text-primary" />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="fw-bold mb-1">{shippingInfo.fullName}</h6>
                              <p className="mb-1">
                                {[
                                  shippingInfo.addressLine1,
                                  shippingInfo.addressLine2,
                                  shippingInfo.brgyName,
                                  shippingInfo.cityName,
                                  shippingInfo.provinceName,
                                  shippingInfo.postalCode,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                              <p className="text-muted mb-0">
                                <BsPhone className="me-1" />
                                {shippingInfo.phone}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Delivery Scheduling */}
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-white border-bottom">
                      <div className="d-flex align-items-center">
                        <div
                          className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                          style={{ width: "32px", height: "32px" }}
                        >
                          <span className="fw-bold">3</span>
                        </div>
                        <h5 className="mb-0 fw-semibold">Schedule Delivery</h5>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-4">
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label className="fw-semibold">
                              <BsCalendar className="me-1 text-primary" />
                              Preferred Delivery Date
                            </Form.Label>
                            <Form.Control
                              type="date"
                              value={scheduledDate}
                              onChange={(e) => {
                                setScheduledDate(e.target.value)
                                setIsDateConfirmed(false)
                              }}
                              min={new Date().toISOString().split("T")[0]}
                            />
                          </Form.Group>
                          {scheduledDate && (
                            <Button
                              variant={isDateConfirmed ? "success" : "outline-primary"}
                              onClick={() => setIsDateConfirmed(true)}
                              disabled={!scheduledDate}
                              className="d-flex align-items-center"
                            >
                              {isDateConfirmed ? <BsCheck className="me-1" /> : <BsCalendar className="me-1" />}
                              {isDateConfirmed ? "Date Confirmed" : "Confirm Date"}
                            </Button>
                          )}
                        </Col>
                        <Col md={6}>
                          {isDateConfirmed && (
                            <Alert variant="success" className="h-100 d-flex align-items-center">
                              <div>
                                <div className="fw-bold mb-1">Delivery Scheduled</div>
                                <div className="small">
                                  {new Date(scheduledDate).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </div>
                                <div className="small text-muted mt-1">
                                  Our team will contact you to confirm the time slot.
                                </div>
                              </div>
                            </Alert>
                          )}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </>
              ) : (
                /* Store Pickup Information */
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Header className="bg-white border-bottom">
                    <div className="d-flex align-items-center">
                      <div
                        className="bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                        style={{ width: "32px", height: "32px" }}
                      >
                        <span className="fw-bold">2</span>
                      </div>
                      <h5 className="mb-0 fw-semibold">Store Pickup Details</h5>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <Row>
                      <Col md={8}>
                        <div className="d-flex align-items-start">
                          <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                            <BsStore className="text-success" size={24} />
                          </div>
                          <div>
                            <h6 className="fw-bold mb-2">Wawa Furniture Main Showroom</h6>
                            <p className="mb-1">
                              <BsGeoAlt className="me-1 text-muted" />
                              123 Furniture Avenue, Brgy. Dela Paz, Wawa, Rizal, 1880
                            </p>
                            <p className="mb-2">
                              <BsClock className="me-1 text-muted" />
                              Mon-Sat: 9:00 AM - 5:00 PM
                            </p>
                            <p className="text-muted small mb-0">
                              Please present your order confirmation email when picking up.
                            </p>
                          </div>
                        </div>
                      </Col>
                      <Col md={4}>
                        <Alert variant="info" className="h-100 d-flex align-items-center">
                          <div className="text-center w-100">
                            <BsInfoCircle className="mb-2" size={24} />
                            <div className="fw-bold small">Ready in 3-5 days</div>
                            <div className="small text-muted">We'll notify you via email & SMS</div>
                          </div>
                        </Alert>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              )}

              {/* Payment Method */}
              <Card className="border-0 shadow-sm mb-4">
                <Card.Header className="bg-white border-bottom">
                  <div className="d-flex align-items-center">
                    <div
                      className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: "32px", height: "32px" }}
                    >
                      <span className="fw-bold">{deliveryOption === "pickup" ? "3" : "4"}</span>
                    </div>
                    <h5 className="mb-0 fw-semibold">Payment Method</h5>
                  </div>
                </Card.Header>
                <Card.Body className="p-4">
                  <Row className="g-3">
                    <Col md={6}>
                      <Card
                        className={`cursor-pointer border-2 ${paymentMethod === "card" ? "border-primary bg-primary bg-opacity-10" : "border-light"
                          }`}
                        onClick={() => setPaymentMethod("card")}
                      >
                        <Card.Body className="text-center p-4">
                          <BsCreditCard2Front className="text-primary mb-2" size={32} />
                          <h6 className="fw-bold mb-1">Credit / Debit Card</h6>
                          <small className="text-muted">Visa, Mastercard, American Express</small>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card
                        className={`cursor-pointer border-2 ${paymentMethod === "gcash" ? "border-success bg-success bg-opacity-10" : "border-light"
                          }`}
                        onClick={() => setPaymentMethod("gcash")}
                      >
                        <Card.Body className="text-center p-4">
                          <BsWallet2 className="text-success mb-2" size={32} />
                          <h6 className="fw-bold mb-1">GCash</h6>
                          <small className="text-muted">Pay with your GCash wallet</small>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                  <Alert variant="info" className="mt-3 mb-0">
                    <BsShield className="me-2" />
                    <small>You will be redirected to our secure payment partner to complete your transaction.</small>
                  </Alert>
                </Card.Body>
              </Card>

              {/* Order Items Review */}
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-bottom">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 fw-semibold">
                      <BsBoxSeam className="me-2 text-primary" />
                      Review Items ({allItems.length})
                    </h5>
                    <Badge bg="secondary" className="px-3 py-2">
                      {selectedItems.length} selected
                    </Badge>
                  </div>
                </Card.Header>
                <ListGroup variant="flush">
                  {allItems.map((entry) => (
                    <ListGroup.Item key={entry.item._id} className="p-4">
                      <div className="d-flex align-items-center">
                        <Form.Check
                          type="checkbox"
                          className="me-3"
                          checked={!!selected[entry.item._id]}
                          onChange={() => handleSelect(entry.item._id)}
                        />
                        <img
                          src={
                            entry.item.imageUrl?.[0] ||
                            `/placeholder.svg?height=80&width=80&text=${entry.item.name.charAt(0) || "/placeholder.svg"}`
                          }
                          alt={entry.item.name}
                          className="rounded"
                          style={{ width: "80px", height: "80px", objectFit: "cover" }}
                        />
                        <div className="ms-3 flex-grow-1">
                          <h6 className="fw-bold mb-1">{entry.item.name}</h6>
                          <div className="d-flex align-items-center gap-3">
                            <small className="text-muted">Qty: {entry.quantity}</small>
                            <small className="text-muted">₱{entry.item.price.toLocaleString()} each</small>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold fs-6">₱{(entry.item.price * entry.quantity).toLocaleString()}</div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>

            {/* Right Column: Order Summary */}
            <Col lg={4}>
              <div className="sticky-top" style={{ top: "7rem" }}>
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-white border-bottom">
                    <h5 className="mb-0 fw-bold">Order Summary</h5>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span>Subtotal ({selectedItems.length} items)</span>
                      <span className="fw-medium">₱{total.toLocaleString()}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <span>
                        <BsTruck className="me-1 text-muted" />
                        {deliveryOption === "shipping" ? "Shipping Fee" : "Pickup Fee"}
                      </span>
                      <span className="fw-medium">{shippingFee > 0 ? `₱${shippingFee.toLocaleString()}` : "FREE"}</span>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <span className="fw-bold fs-5">Total</span>
                      <span className="fw-bold fs-5 text-primary">₱{grandTotal.toLocaleString()}</span>
                    </div>

                    <div className="d-grid gap-2">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={handleCheckout}
                        disabled={isLoading || selectedItems.length === 0}
                        className="fw-bold py-3"
                      >
                        {isLoading ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <BsCheckCircle className="me-2" />
                            Place Order ({selectedItems.length})
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => navigate("/cart")}
                        disabled={isLoading}
                        className="d-flex align-items-center justify-content-center"
                      >
                        <BsArrowLeft className="me-2" />
                        Back to Cart
                      </Button>
                    </div>

                    <div className="mt-4 pt-3 border-top">
                      <div className="d-flex justify-content-center gap-4 text-muted">
                        <div className="text-center">
                          <BsShield className="d-block mx-auto mb-1" />
                          <small>Secure</small>
                        </div>
                        <div className="text-center">
                          <BsTruck className="d-block mx-auto mb-1" />
                          <small>Fast Delivery</small>
                        </div>
                        <div className="text-center">
                          <BsCheckCircle className="d-block mx-auto mb-1" />
                          <small>Quality</small>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </Col>
          </Row>
        )}
      </Container>

      {/* Address Modal */}
      <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            <BsGeoAlt className="me-2 text-primary" />
            {shippingInfo.fullName ? "Edit Shipping Address" : "Add Shipping Address"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="px-4">
          <Form>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <BsPersonFill className="me-1 text-primary" />
                    Full Name *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={shippingInfo.fullName}
                    onChange={(e) => setShippingInfo((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="fw-semibold">
                    <BsPhone className="me-1 text-primary" />
                    Phone Number *
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text>+63</InputGroup.Text>
                    <Form.Control
                      type="text"
                      value={shippingInfo.phone}
                      onChange={(e) => setShippingInfo((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="9XX XXX XXXX"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Address Line 1 *</Form.Label>
              <Form.Control
                type="text"
                value={shippingInfo.addressLine1}
                onChange={(e) => setShippingInfo((prev) => ({ ...prev, addressLine1: e.target.value }))}
                placeholder="House/Unit No., Building, Street"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Address Line 2 (Optional)</Form.Label>
              <Form.Control
                type="text"
                value={shippingInfo.addressLine2}
                onChange={(e) => setShippingInfo((prev) => ({ ...prev, addressLine2: e.target.value }))}
                placeholder="Subdivision, Area, Landmark"
              />
            </Form.Group>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Province *</Form.Label>
                  <Form.Select
                    value={shippingInfo.province}
                    onChange={(e) => {
                      const selectedName = e.target.options[e.target.selectedIndex].text
                      setShippingInfo((prev) => ({ ...prev, province: e.target.value, provinceName: selectedName }))
                    }}
                    disabled={isLoadingProvinces}
                  >
                    <option value="">{isLoadingProvinces ? "Loading..." : "Select Province"}</option>
                    {provinces.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">City *</Form.Label>
                  <Form.Select
                    value={shippingInfo.city}
                    onChange={(e) => {
                      const selectedName = e.target.options[e.target.selectedIndex].text
                      setShippingInfo((prev) => ({ ...prev, city: e.target.value, cityName: selectedName }))
                    }}
                    disabled={!shippingInfo.province || isLoadingCities}
                  >
                    <option value="">{isLoadingCities ? "Loading..." : "Select City"}</option>
                    {cities.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Barangay *</Form.Label>
                  <Form.Select
                    value={shippingInfo.brgy}
                    onChange={(e) => {
                      const selectedName = e.target.options[e.target.selectedIndex].text
                      setShippingInfo((prev) => ({ ...prev, brgy: e.target.value, brgyName: selectedName }))
                    }}
                    disabled={!shippingInfo.city || isLoadingBarangays}
                  >
                    <option value="">{isLoadingBarangays ? "Loading..." : "Select Barangay"}</option>
                    {barangays.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="fw-semibold">Postal Code</Form.Label>
                  <Form.Control
                    type="text"
                    value={shippingInfo.postalCode}
                    onChange={(e) => setShippingInfo((prev) => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="e.g. 1200"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={() => setShowAddressModal(false)}>
            <BsX className="me-1" />
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveShippingInfo}>
            <BsCheck className="me-1" />
            Save Address
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default CheckoutPage
