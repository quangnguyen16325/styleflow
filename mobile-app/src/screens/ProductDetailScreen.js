/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  getProductById,
  getProductReviews,
  getProductReviewSummary,
  formatPrice,
} from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import BackPillButton from "../components/BackPillButton";
import AppIcon from "../components/AppIcon";
import AppImage from "../components/AppImage";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const rawProductId = route.params?.productId ?? route.params?.id ?? 1;
  const productId = parseInt(String(rawProductId), 10);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedReviewImage, setSelectedReviewImage] = useState(null);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);

        try {
          const reviewData = await getProductReviews(productId, { limit: 3 });
          setReviews(Array.isArray(reviewData?.items) ? reviewData.items : []);
          setReviewTotal(Number(reviewData?.total ?? 0));
        } catch (reviewError) {
          console.warn("Error fetching product reviews:", reviewError);
          setReviews([]);
          setReviewTotal(0);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
        setReviews([]);
        setReviewTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    setQuantity((prev) => {
      if (product.availableQty <= 0) return 0;
      return Math.min(Math.max(prev, 1), product.availableQty);
    });
  }, [product]);

  const liked = product ? isInWishlist(product.id) : false;
  const availableQty = Number(product?.availableQty ?? 0);
  const minStockLevel = Number(product?.minStockLevel ?? 0);
  const isOutOfStock = availableQty <= 0;
  const imageUrl = product?.imageUrl || null;
  const reviewCount = Number(product?.reviewCount ?? reviewTotal ?? 0);
  const ratingAverage = Number(product?.ratingAverage ?? 0);

  const stockLabel = isOutOfStock
    ? "Hết hàng"
    : availableQty <= minStockLevel
      ? "Sắp hết hàng"
      : "Còn hàng";

  const stockTone = isOutOfStock
    ? styles.stockBadgeDanger
    : availableQty <= minStockLevel
      ? styles.stockBadgeWarn
      : styles.stockBadgeOk;

  const increaseQty = () => {
    if (!product || isOutOfStock) return;
    setQuantity((prev) => Math.min(prev + 1, availableQty));
  };

  const decreaseQty = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, quantity);
    alert("Đã thêm vào giỏ hàng!");
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, quantity);
    navigation.navigate("Checkout");
  };

  const handleOpenAiSummary = async () => {
    setAiSummaryVisible(true);
    setAiSummaryError("");

    if (aiSummary) {
      return;
    }

    try {
      setLoadingAiSummary(true);
      const summary = await getProductReviewSummary(productId);
      setAiSummary(summary);
    } catch (error) {
      setAiSummaryError(error.message || "Không thể tải phân tích AI. Vui lòng thử lại.");
    } finally {
      setLoadingAiSummary(false);
    }
  };

  const handleViewOriginalReviews = () => {
    setAiSummaryVisible(false);
    navigation.navigate("ProductReviews", {
      productId: product.id,
      productName: product.name,
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9B4B1F" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Không tải được sản phẩm</Text>
        <BackPillButton onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.heroWrapper}>
          <AppImage source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        </View>

        <View style={styles.contentPanel}>
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <Text style={styles.priceText}>{formatPrice(product.basePrice)}</Text>
              <Text style={styles.titleText}>{product.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.heartBtnTop}
              onPress={() => toggleWishlist(product)}
              activeOpacity={0.85}
            >
              <AppIcon
                name={liked ? "heartFilled" : "heart"}
                size={22}
                color={liked ? "#E5484D" : "#AA9C8F"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            {product.category ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{product.category}</Text>
              </View>
            ) : null}
            {product.sku ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>SKU: {product.sku}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.stockBadge, stockTone]}>
            <Text style={styles.stockBadgeText}>{stockLabel}</Text>
          </View>

          <View style={styles.reviewSummaryCard}>
            <View>
              <Text style={styles.reviewSummaryLabel}>Đánh giá sản phẩm</Text>
              <View style={styles.reviewScoreRow}>
                <StarRating rating={Math.round(ratingAverage)} />
                <Text style={styles.reviewScoreText}>
                  {reviewCount > 0 ? `${ratingAverage.toFixed(1)} / 5` : "Chưa có đánh giá"}
                </Text>
              </View>
            </View>
            <View style={styles.reviewSummaryRight}>
              <Text style={styles.reviewCountText}>{reviewCount} nhận xét</Text>
              <TouchableOpacity
                style={styles.aiSummaryBtn}
                activeOpacity={0.85}
                onPress={handleOpenAiSummary}
              >
                <Text style={styles.aiSummaryBtnText}>AI phân tích</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Thông tin sản phẩm</Text>
          <Text style={styles.descText}>
            {product.category
              ? `Danh mục: ${product.category}.`
              : "Sản phẩm hiện đã sẵn sàng để đặt hàng."}{" "}
            {isOutOfStock
              ? "Sản phẩm đang tạm hết hàng."
              : `Bạn có thể đặt tối đa ${availableQty} sản phẩm ở thời điểm hiện tại.`}
          </Text>

          <View style={styles.purchaseInfoCard}>
            <Text style={styles.purchaseInfoLabel}>Số lượng có thể đặt</Text>
            <Text style={styles.purchaseInfoValue}>{availableQty}</Text>
            <Text style={styles.purchaseInfoHint}>
              {availableQty <= minStockLevel && !isOutOfStock
                ? "Số lượng còn lại không nhiều. Nên đặt sớm nếu bạn muốn giữ hàng."
                : "Giới hạn này được lấy trực tiếp từ tồn kho hiện tại của hệ thống."}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Số lượng</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyCircle, quantity <= 1 && styles.qtyCircleDisabled]}
              onPress={decreaseQty}
              disabled={quantity <= 1}
            >
              <Text style={styles.qtyCircleText}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyBoxText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.qtyCircle,
                (isOutOfStock || quantity >= availableQty) && styles.qtyCircleDisabled,
              ]}
              onPress={increaseQty}
              disabled={isOutOfStock || quantity >= availableQty}
            >
              <Text style={styles.qtyCircleText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            {isOutOfStock
              ? "Sản phẩm hiện không thể đặt thêm."
              : `Bạn đang chọn ${quantity} / ${availableQty} sản phẩm có thể đặt.`}
          </Text>

          <View style={styles.summaryCard}>
            <SummaryRow label="Đơn giá" value={formatPrice(product.basePrice)} />
            <SummaryRow label="Tạm tính" value={formatPrice(product.basePrice * quantity)} />
          </View>

          <View style={styles.reviewSectionHeader}>
            <Text style={styles.sectionTitle}>Nhận xét từ khách hàng</Text>
            {reviewCount > 0 ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate("ProductReviews", {
                    productId: product.id,
                    productName: product.name,
                  })
                }
              >
                <Text style={styles.reviewViewAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {reviews.length > 0 ? (
            <View style={styles.reviewList}>
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} onOpenImage={setSelectedReviewImage} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyReviewCard}>
              <Text style={styles.emptyReviewTitle}>Chưa có nhận xét</Text>
              <Text style={styles.emptyReviewText}>
                Những đánh giá từ khách đã mua sẽ xuất hiện tại đây.
              </Text>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Text style={styles.secondaryBtnText}>{isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, isOutOfStock && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleBuyNow}
          disabled={isOutOfStock}
        >
          <Text style={styles.primaryBtnText}>{isOutOfStock ? "Không thể mua" : "Mua ngay"}</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={!!selectedReviewImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedReviewImage(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedReviewImage(null)}
          />
          <View style={styles.imageViewerContent}>
            <AppImage
              source={{ uri: selectedReviewImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.imageViewerClose}
              activeOpacity={0.85}
              onPress={() => setSelectedReviewImage(null)}
            >
              <Text style={styles.imageViewerCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={aiSummaryVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAiSummaryVisible(false)}
      >
        <View style={styles.aiModalOverlay}>
          <TouchableOpacity
            style={styles.aiModalBackdrop}
            activeOpacity={1}
            onPress={() => setAiSummaryVisible(false)}
          />
          <View style={styles.aiModalSheet}>
            <View style={styles.aiModalHandle} />
            <Text style={styles.aiModalTitle}>AI phân tích đánh giá</Text>
            <Text style={styles.aiModalSubtitle}>
              Tóm tắt tự động từ các bình luận hiển thị của khách hàng.
            </Text>

            {loadingAiSummary ? (
              <ActivityIndicator color="#9B4B1F" style={{ marginVertical: 20 }} />
            ) : aiSummaryError ? (
              <View style={styles.aiEmptyCard}>
                <Text style={styles.aiEmptyTitle}>Không tải được phân tích</Text>
                <Text style={styles.aiEmptyText}>{aiSummaryError}</Text>
              </View>
            ) : !aiSummary || Number(aiSummary.aiReviewCount || 0) === 0 ? (
              <View style={styles.aiEmptyCard}>
                <Text style={styles.aiEmptyTitle}>Chưa đủ dữ liệu</Text>
                <Text style={styles.aiEmptyText}>
                  Sản phẩm chưa có đủ đánh giá đã được AI phân tích.
                </Text>
              </View>
            ) : (
              <View style={styles.aiContent}>
                <View style={styles.aiSummaryTextCard}>
                  <Text style={styles.aiSummaryMainText}>{aiSummary.summaryText}</Text>
                  <Text style={styles.aiSummaryNote}>
                    {aiSummary.dataNote ||
                      `Tóm tắt dựa trên ${aiSummary.aiReviewCount} đánh giá đã được AI phân tích, chỉ mang tính tham khảo.`}
                  </Text>
                </View>

                <View style={styles.aiMetricGrid}>
                  <AiMetric label="Đã phân tích" value={`${aiSummary.aiReviewCount}`} />
                  <AiMetric label="Tích cực" value={`${aiSummary.positiveRate}%`} />
                  <AiMetric
                    label="Điểm TB"
                    value={`${Number(aiSummary.ratingAverage || 0).toFixed(1)}/5`}
                  />
                </View>

                <AspectList
                  title="Khách hàng đánh giá cao"
                  aspects={aiSummary.praisedAspects}
                  emptyText="Chưa có khía cạnh tích cực nổi bật."
                  tone="positive"
                />
                <AspectList
                  title="Một số điểm cần chú ý"
                  aspects={aiSummary.concernAspects}
                  emptyText="Chưa ghi nhận điểm tiêu cực nổi bật."
                  tone="negative"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.aiReviewsBtn}
              activeOpacity={0.85}
              onPress={handleViewOriginalReviews}
            >
              <Text style={styles.aiReviewsBtnText}>Xem đánh giá gốc</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aiCloseBtn}
              activeOpacity={0.85}
              onPress={() => setAiSummaryVisible(false)}
            >
              <Text style={styles.aiCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function StarRating({ rating, size = 15 }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={[styles.starText, { fontSize: size }]}>
          {star <= rating ? "★" : "☆"}
        </Text>
      ))}
    </View>
  );
}

function AiMetric({ label, value }) {
  return (
    <View style={styles.aiMetricCard}>
      <Text style={styles.aiMetricLabel}>{label}</Text>
      <Text style={styles.aiMetricValue}>{value}</Text>
    </View>
  );
}

function AspectList({ title, aspects, emptyText, tone }) {
  const hasAspects = Array.isArray(aspects) && aspects.length > 0;
  return (
    <View style={styles.aiAspectBlock}>
      <Text style={styles.aiAspectTitle}>{title}</Text>
      {hasAspects ? (
        <View style={styles.aiAspectList}>
          {aspects.map((aspect) => (
            <View
              key={`${aspect.key}-${aspect.label}`}
              style={[
                styles.aiAspectChip,
                tone === "negative" ? styles.aiAspectChipNegative : styles.aiAspectChipPositive,
              ]}
            >
              <Text
                style={[
                  styles.aiAspectChipText,
                  tone === "negative"
                    ? styles.aiAspectChipTextNegative
                    : styles.aiAspectChipTextPositive,
                ]}
              >
                {aspect.label}
                {aspect.count ? ` · ${aspect.count}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.aiAspectEmpty}>{emptyText}</Text>
      )}
    </View>
  );
}

function ReviewCard({ review, onOpenImage }) {
  const createdLabel = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString("vi-VN")
    : "Không rõ ngày";

  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewCardTop}>
        <View>
          <Text style={styles.reviewCustomer}>{review.customerName || "Khách hàng"}</Text>
          <Text style={styles.reviewDate}>{createdLabel}</Text>
        </View>
        <StarRating rating={Number(review.rating || 0)} size={14} />
      </View>
      {review.comment ? <Text style={styles.reviewComment}>{review.comment}</Text> : null}
      {Array.isArray(review.images) && review.images.length > 0 ? (
        <View style={styles.reviewImageList}>
          {review.images.slice(0, 4).map((image) => (
            <TouchableOpacity key={image} activeOpacity={0.85} onPress={() => onOpenImage(image)}>
              <AppImage source={{ uri: image }} style={styles.reviewImageThumb} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const RADIUS = 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FCF9F4" },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF9F4",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1815",
    marginBottom: 16,
  },
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: "#F1EBE4",
  },
  heroImage: { width: "100%", height: "100%" },
  contentPanel: {
    marginTop: -RADIUS,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleCol: { flex: 1 },
  priceText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#9B4B1F",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1815",
    lineHeight: 24,
  },
  heartBtnTop: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  metaChip: {
    backgroundColor: "#F5ECE3",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#76675B",
    textTransform: "uppercase",
  },
  stockBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  stockBadgeOk: { backgroundColor: "#F3EFE9" },
  stockBadgeWarn: { backgroundColor: "#F9E4D4" },
  stockBadgeDanger: { backgroundColor: "#F2D5D5" },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E1815",
  },
  reviewSummaryCard: {
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#EBE1D7",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  reviewSummaryRight: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  reviewSummaryLabel: {
    color: "#76675B",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  reviewScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reviewScoreText: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewCountText: {
    color: "#8A7B6F",
    fontSize: 12,
    fontWeight: "700",
  },
  aiSummaryBtn: {
    borderRadius: 999,
    backgroundColor: "#1E1815",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  aiSummaryBtnText: {
    color: "#FFFDF9",
    fontSize: 12,
    fontWeight: "800",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starText: {
    color: "#D99152",
    fontWeight: "900",
    marginRight: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1815",
    marginTop: 20,
    marginBottom: 10,
  },
  reviewSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  reviewViewAllText: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 20,
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: "#76675B",
    lineHeight: 22,
  },
  purchaseInfoCard: {
    marginTop: 12,
    backgroundColor: "#F5ECE3",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  purchaseInfoLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#AA9C8F",
    marginBottom: 6,
  },
  purchaseInfoValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1E1815",
    marginBottom: 6,
  },
  purchaseInfoHint: {
    fontSize: 13,
    lineHeight: 20,
    color: "#76675B",
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5ECE3",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCircleDisabled: {
    opacity: 0.45,
  },
  qtyCircleText: {
    fontSize: 24,
    color: "#1E1815",
    marginTop: -2,
  },
  qtyBox: {
    minWidth: 56,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F5ECE3",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBoxText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E1815",
  },
  helperText: {
    fontSize: 13,
    color: "#AA9C8F",
    marginTop: 12,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#EBE1D7",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  reviewList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#EBE1D7",
    borderRadius: 18,
    padding: 14,
  },
  reviewCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  reviewCustomer: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewDate: {
    color: "#AA9C8F",
    fontSize: 12,
    marginTop: 2,
  },
  reviewComment: {
    color: "#54483E",
    fontSize: 14,
    lineHeight: 21,
  },
  reviewImageList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  reviewImageThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#EFE8E0",
  },
  aiModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 18, 14, 0.36)",
  },
  aiModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  aiModalSheet: {
    backgroundColor: "#FCF9F4",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 30,
    maxHeight: "82%",
  },
  aiModalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D3C4B6",
    marginBottom: 14,
  },
  aiModalTitle: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "900",
  },
  aiModalSubtitle: {
    color: "#76675B",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 16,
  },
  aiEmptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EDE0D3",
  },
  aiEmptyTitle: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  aiEmptyText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 21,
  },
  aiContent: {
    gap: 12,
  },
  aiSummaryTextCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE0D3",
    padding: 14,
  },
  aiSummaryMainText: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
  },
  aiSummaryNote: {
    color: "#8A7B6F",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  aiMetricGrid: {
    flexDirection: "row",
    gap: 8,
  },
  aiMetricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EDE0D3",
    padding: 12,
  },
  aiMetricLabel: {
    color: "#8A7B6F",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  aiMetricValue: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "900",
  },
  aiAspectBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EDE0D3",
    padding: 14,
  },
  aiAspectTitle: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 10,
  },
  aiAspectList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aiAspectChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  aiAspectChipPositive: {
    backgroundColor: "#E6F4EA",
  },
  aiAspectChipNegative: {
    backgroundColor: "#FDE8E8",
  },
  aiAspectChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  aiAspectChipTextPositive: {
    color: "#1F7A3F",
  },
  aiAspectChipTextNegative: {
    color: "#B42318",
  },
  aiAspectEmpty: {
    color: "#8A7B6F",
    fontSize: 13,
    lineHeight: 20,
  },
  aiCloseBtn: {
    marginTop: 10,
    borderRadius: 16,
    backgroundColor: "#1E1815",
    paddingVertical: 14,
    alignItems: "center",
  },
  aiCloseBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "900",
  },
  aiReviewsBtn: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#F5ECE3",
    paddingVertical: 14,
    alignItems: "center",
  },
  aiReviewsBtnText: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "900",
  },
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(18, 13, 10, 0.86)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  imageViewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  imageViewerContent: {
    width: "100%",
    maxHeight: "84%",
    alignItems: "center",
  },
  imageViewerImage: {
    width: "100%",
    height: SCREEN_HEIGHT * 0.68,
    borderRadius: 18,
    backgroundColor: "#1E1815",
  },
  imageViewerClose: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FFFDF9",
  },
  imageViewerCloseText: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyReviewCard: {
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#EBE1D7",
    borderRadius: 18,
    padding: 16,
  },
  emptyReviewTitle: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyReviewText: {
    color: "#76675B",
    fontSize: 13,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#76675B",
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1815",
  },
  bottomSpacer: { height: 110 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 26,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F0EAE1",
  },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#F5ECE3",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1815",
  },
  primaryBtn: {
    flex: 1.2,
    height: 54,
    borderRadius: 16,
    backgroundColor: "#1E1815",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFDF9",
  },
});
