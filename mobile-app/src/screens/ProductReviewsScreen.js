/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import AppImage from "../components/AppImage";
import { getProductReviews } from "../services/api";

const PAGE_SIZE = 10;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ProductReviewsScreen() {
  const route = useRoute();
  const productId = Number(route.params?.productId);
  const productName = route.params?.productName || "Sản phẩm";

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const hasImagesOnly = filter === "images";

  const fetchReviews = useCallback(
    async ({ nextOffset = 0, append = false, silent = false } = {}) => {
      if (!productId) return;

      try {
        if (!silent) {
          if (append) {
            setLoadingMore(true);
          } else {
            setLoading(true);
          }
        }
        setError(null);

        const data = await getProductReviews(productId, {
          limit: PAGE_SIZE,
          offset: nextOffset,
          hasImages: hasImagesOnly ? "true" : undefined,
        });
        const nextItems = Array.isArray(data?.items) ? data.items : [];

        setReviews((current) => (append ? [...current, ...nextItems] : nextItems));
        setTotal(Number(data?.total ?? 0));
        setOffset(nextOffset + nextItems.length);
      } catch (fetchError) {
        console.warn("Error fetching product reviews:", fetchError);
        setError("Không tải được đánh giá. Vui lòng thử lại.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [hasImagesOnly, productId],
  );

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleFilterChange = (nextFilter) => {
    if (filter === nextFilter) return;
    setFilter(nextFilter);
    setReviews([]);
    setTotal(0);
    setOffset(0);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReviews({ nextOffset: 0, silent: true });
  };

  const handleLoadMore = () => {
    if (loadingMore || offset >= total) return;
    fetchReviews({ nextOffset: offset, append: true });
  };

  const canLoadMore = offset < total;

  return (
    <View style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Reviews</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={styles.heroSubtext}>{total} đánh giá phù hợp</Text>
        </View>

        <View style={styles.filterRow}>
          <FilterChip
            label="Tất cả"
            active={filter === "all"}
            onPress={() => handleFilterChange("all")}
          />
          <FilterChip
            label="Có hình ảnh"
            active={filter === "images"}
            onPress={() => handleFilterChange("images")}
          />
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color="#9B4B1F" />
            <Text style={styles.centerText}>Đang tải đánh giá...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerCard}>
            <Text style={styles.emptyTitle}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchReviews()}>
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.centerCard}>
            <Text style={styles.emptyTitle}>
              {hasImagesOnly ? "Chưa có đánh giá kèm ảnh" : "Chưa có đánh giá"}
            </Text>
            <Text style={styles.emptyText}>
              {hasImagesOnly
                ? "Các đánh giá có hình ảnh từ khách hàng sẽ xuất hiện tại đây."
                : "Những đánh giá từ khách đã mua sẽ xuất hiện tại đây."}
            </Text>
          </View>
        ) : (
          <View style={styles.reviewList}>
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} onOpenImage={setSelectedImage} />
            ))}

            {canLoadMore ? (
              <TouchableOpacity
                style={[styles.loadMoreBtn, loadingMore && styles.loadMoreBtnDisabled]}
                onPress={handleLoadMore}
                disabled={loadingMore}
                activeOpacity={0.85}
              >
                {loadingMore ? (
                  <ActivityIndicator color="#FFFDF9" size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Xem thêm đánh giá</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity
            style={styles.imageViewerBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedImage(null)}
          />
          <View style={styles.imageViewerContent}>
            <AppImage
              source={{ uri: selectedImage }}
              style={styles.imageViewerImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.imageViewerClose}
              activeOpacity={0.85}
              onPress={() => setSelectedImage(null)}
            >
              <Text style={styles.imageViewerCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StarRating({ rating }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text key={star} style={styles.starText}>
          {star <= rating ? "★" : "☆"}
        </Text>
      ))}
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
        <View style={styles.reviewCustomerWrap}>
          <Text style={styles.reviewCustomer}>{review.customerName || "Khách hàng"}</Text>
          <Text style={styles.reviewDate}>{createdLabel}</Text>
        </View>
        <StarRating rating={Number(review.rating || 0)} />
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 34,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#1E1815",
    marginBottom: 14,
  },
  heroEyebrow: {
    color: "#DCC4A8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFF8EE",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
  },
  heroSubtext: {
    color: "#DCC4A8",
    fontSize: 13,
    marginTop: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DBCE",
  },
  filterChipActive: {
    backgroundColor: "#1E1815",
    borderColor: "#1E1815",
  },
  filterChipText: {
    color: "#76675B",
    fontSize: 13,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: "#FFFDF9",
  },
  centerCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBE1D7",
  },
  centerText: {
    color: "#76675B",
    fontSize: 13,
    marginTop: 10,
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyText: {
    color: "#76675B",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#1E1815",
  },
  retryText: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "800",
  },
  reviewList: {
    gap: 10,
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
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
  reviewCustomerWrap: {
    flex: 1,
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
  starRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  starText: {
    color: "#D99152",
    fontSize: 14,
    fontWeight: "900",
    marginRight: 1,
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
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: "#EFE8E0",
  },
  loadMoreBtn: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: "#1E1815",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  loadMoreBtnDisabled: {
    opacity: 0.65,
  },
  loadMoreText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
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
});
