package com.microgig.payload.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardResponse implements Serializable {
    private static final long serialVersionUID = 1L;

    private List<FreelancerRankDto> topRated;
    private List<FreelancerRankDto> topCompleted;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FreelancerRankDto implements Serializable {
        private static final long serialVersionUID = 1L;

        private String username;
        private String fullName;
        private Double score;
        private Integer rank;
    }
}
